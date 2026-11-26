import { Inject, Injectable } from "@nestjs/common";
import { generateSlots } from "@tanstack/time";
import type {
  GenerateSlotsResult,
  Slot,
  SlotOccupyingEvent,
} from "@tanstack/time";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from "../database/database";
import { bookings } from "@meeteora/db";
import { toCivil } from "./civil-time";
import { EventTypesService } from "./event-types.service";
import { ResourcesService } from "./resources.service";
import { BookingRulesService } from "./booking-rules.service";
import { TIME_ZONE, toWorkingCalendar } from "./schedule";

const EVENT_PADDING_MS = 24 * 60 * 60 * 1000;
const SLOT_LOOKUP_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Generated per (event type, resource) before merging, so allow more than the default. */
const MAX_SLOTS = 50_000;

/**
 * Rules are split per resource, so the same event type at the same time comes
 * back once per open resource. Merge those into one slot listing every host.
 */
function mergeByTime(slots: Array<Slot>): Array<Slot> {
  const merged = new Map<string, Slot>();
  for (const slot of slots) {
    const key = `${slot.ruleId}|${slot.startEpochMs}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...slot, availableResourceIds: [...slot.availableResourceIds] });
      continue;
    }
    existing.availableResourceIds.push(...slot.availableResourceIds);
    existing.remainingCapacity += slot.remainingCapacity;
  }
  return [...merged.values()];
}

@Injectable()
export class SlotsService {
  @Inject(DATABASE)
  private readonly db: Database;

  @Inject(EventTypesService)
  private readonly eventTypes: EventTypesService;

  @Inject(ResourcesService)
  private readonly resources: ResourcesService;

  @Inject(BookingRulesService)
  private readonly bookingRules: BookingRulesService;

  /** `ignoreBookingId` frees the time that booking holds, e.g. while moving it. */
  async list(
    from: Date,
    to: Date,
    executor: DatabaseExecutor = this.db,
    ignoreBookingId?: string,
  ): Promise<GenerateSlotsResult> {
    const resources = await this.resources.listSlotResources(executor);
    const rules = await this.bookingRules.settings(executor);
    const result = generateSlots({
      rules: await this.eventTypes.listRules(
        resources.map(({ resource }) => resource.id),
        rules,
        executor,
      ),
      range: { start: toCivil(from, TIME_ZONE), end: toCivil(to, TIME_ZONE) },
      now: toCivil(new Date(), TIME_ZONE),
      timeZone: TIME_ZONE,
      calendars: resources.map(({ resource, hours }) =>
        toWorkingCalendar(resource.id, hours),
      ),
      resources: resources.map(({ resource }) => resource),
      events: await this.occupyingEvents(from, to, executor, ignoreBookingId),
      maxSlots: MAX_SLOTS,
    });
    return { ...result, slots: mergeByTime(result.slots) };
  }

  async find(
    ruleId: string,
    start: Date,
    executor: DatabaseExecutor = this.db,
    ignoreBookingId?: string,
  ): Promise<Slot | undefined> {
    const { slots } = await this.list(
      start,
      new Date(start.getTime() + SLOT_LOOKUP_WINDOW_MS),
      executor,
      ignoreBookingId,
    );
    return slots.find(
      (slot) => slot.ruleId === ruleId && slot.startEpochMs === start.getTime(),
    );
  }

  private async occupyingEvents(
    from: Date,
    to: Date,
    executor: DatabaseExecutor,
    ignoreBookingId?: string,
  ): Promise<Array<SlotOccupyingEvent>> {
    const rows = await executor
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          lt(bookings.startAt, new Date(to.getTime() + EVENT_PADDING_MS)),
          gt(bookings.endAt, new Date(from.getTime() - EVENT_PADDING_MS)),
          ignoreBookingId ? ne(bookings.id, ignoreBookingId) : undefined,
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      start: toCivil(row.startAt, TIME_ZONE),
      end: toCivil(row.endAt, TIME_ZONE),
      resourceIds: [row.resourceId],
      expiresAt: row.expiresAt ? toCivil(row.expiresAt, TIME_ZONE) : undefined,
    }));
  }
}
