import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import {
  type Booking,
  type BookingIdRequest,
  type CreateBookingRequest,
  Events,
  type ListBookingsRequest,
  type RescheduleBookingRequest,
  type RpcError,
} from "@meeteora/contracts";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { DATABASE, type Database } from "../database/database";
import {
  bookings,
  eventTypes,
  organizations,
  outbox,
} from "@meeteora/db";
import { parseInstant } from "./instant";
import { BookingRulesService } from "./booking-rules.service";
import { TIME_ZONE } from "./schedule";
import { SlotsService } from "./slots.service";

const DEFAULT_ORGANIZATION_SLUG = "default";
const BOOKING_LOCK_KEY = "bookings";
const LIST_LIMIT = 200;
const MINUTE_MS = 60_000;

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

const instantFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

function formatInstant(instant: Date): string {
  return instantFormat.format(instant);
}

function formatNotice(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} min`;
  return `${minutes / 60}h`;
}

function toBooking(row: typeof bookings.$inferSelect): Booking {
  return {
    status: row.status,
    attendee: { name: row.attendeeName, email: row.attendeeEmail },
    id: row.id,
    ruleId: row.ruleId,
    resourceId: row.resourceId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
  };
}

@Injectable()
export class BookingsService {
  @Inject(DATABASE)
  private readonly db: Database;

  constructor(
    @Inject(SlotsService) private readonly slots: SlotsService,
    @Inject(BookingRulesService)
    private readonly bookingRules: BookingRulesService,
  ) {}

  async create({
    ruleId,
    start,
    attendee,
  }: CreateBookingRequest): Promise<Booking> {
    const startAt = parseInstant(start);

    const row = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${BOOKING_LOCK_KEY}))`,
      );

      const [rule] = await tx
        .select({ id: eventTypes.id })
        .from(eventTypes)
        .where(eq(eventTypes.id, ruleId));
      if (!rule) throw rpcError(404, `Unknown rule: ${ruleId}`);

      const slot = await this.slots.find(ruleId, startAt, tx);
      const resourceId = slot?.availableResourceIds[0];
      if (!slot || !resourceId) throw rpcError(409, "Slot is not available");

      const [organization] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.slug, DEFAULT_ORGANIZATION_SLUG));
      if (!organization) throw rpcError(500, "Default organization is missing");

      const [inserted] = await tx
        .insert(bookings)
        .values({
          organizationId: organization.id,
          ruleId,
          resourceId,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          startAt: new Date(slot.startEpochMs),
          endAt: new Date(slot.endEpochMs),
        })
        .returning();
      await this.queueEvent(tx, Events.bookingCreated, toBooking(inserted));
      return inserted;
    });

    return toBooking(row);
  }

  /** Same rules as booking: the new start must be an open slot for its host. */
  async reschedule({ id, start }: RescheduleBookingRequest): Promise<Booking> {
    const startAt = parseInstant(start);

    const row = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${BOOKING_LOCK_KEY}))`,
      );

      const [booking] = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id));
      if (!booking) throw rpcError(404, `Unknown booking: ${id}`);
      if (booking.status !== "confirmed") {
        throw rpcError(409, "Only confirmed bookings can be moved");
      }
      if (booking.startAt.getTime() === startAt.getTime()) return booking;
      const { minNoticeMinutes } = await this.bookingRules.settings(tx);
      const earliest = Date.now() + minNoticeMinutes * MINUTE_MS;
      if (startAt.getTime() < earliest) {
        throw rpcError(
          409,
          `Too soon: bookings need ${formatNotice(minNoticeMinutes)} notice. Earliest: ${formatInstant(new Date(earliest))}`,
        );
      }

      const slot = await this.slots.find(booking.ruleId, startAt, tx, id);
      if (!slot) {
        throw rpcError(
          409,
          "That time isn't an open slot for this event type (check working hours and the slot grid)",
        );
      }
      if (!slot.availableResourceIds.includes(booking.resourceId)) {
        throw rpcError(409, "The host is already fully booked at that time");
      }

      const [updated] = await tx
        .update(bookings)
        .set({
          startAt: new Date(slot.startEpochMs),
          endAt: new Date(slot.endEpochMs),
        })
        .where(eq(bookings.id, id))
        .returning();
      await this.queueEvent(tx, Events.bookingRescheduled, toBooking(updated));
      return updated;
    });

    return toBooking(row);
  }

  async list({ from }: ListBookingsRequest): Promise<Array<Booking>> {
    const rows = await this.db
      .select()
      .from(bookings)
      .where(gte(bookings.startAt, parseInstant(from)))
      .orderBy(asc(bookings.startAt))
      .limit(LIST_LIMIT);
    return rows.map(toBooking);
  }

  async get({ id }: BookingIdRequest): Promise<Booking> {
    const [row] = await this.db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    if (!row) throw rpcError(404, `Unknown booking: ${id}`);
    return toBooking(row);
  }

  async cancel({ id }: BookingIdRequest): Promise<Booking> {
    const row = await this.db.transaction(async (tx) => {
      const [cancelled] = await tx
        .update(bookings)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(and(eq(bookings.id, id), eq(bookings.status, "confirmed")))
        .returning();
      if (cancelled) {
        await this.queueEvent(
          tx,
          Events.bookingCancelled,
          toBooking(cancelled),
        );
      }
      return cancelled;
    });
    if (!row) return this.get({ id });
    return toBooking(row);
  }

  // Events are written to the outbox in the same transaction as the state
  // change; OutboxRelay publishes them asynchronously (at-least-once).
  private async queueEvent(
    db: Pick<Database, "insert">,
    topic: string,
    payload: Booking,
  ): Promise<void> {
    await db.insert(outbox).values({ topic, payload });
  }
}
