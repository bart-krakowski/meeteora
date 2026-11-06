import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import {
  type Booking,
  type BookingIdRequest,
  type CreateBookingRequest,
  Events,
  type ListBookingsRequest,
  type RpcError,
} from "@scheduler/contracts";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { DATABASE, type Database } from "../database/database";
import {
  bookings,
  eventTypes,
  organizations,
  outbox,
} from "../database/schema";
import { parseInstant } from "./instant";
import { SlotsService } from "./slots.service";

const DEFAULT_ORGANIZATION_SLUG = "default";
const BOOKING_LOCK_KEY = "bookings";
const LIST_LIMIT = 200;

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
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

  constructor(@Inject(SlotsService) private readonly slots: SlotsService) {}

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
