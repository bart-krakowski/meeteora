import { Inject, Injectable } from "@nestjs/common";
import { generateSlots } from "@tanstack/time";
import type {
  GenerateSlotsResult,
  Slot,
  SlotOccupyingEvent,
} from "@tanstack/time";
import { and, eq, gt, lt } from "drizzle-orm";
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from "../database/database";
import { bookings } from "../database/schema";
import { toCivil } from "./civil-time";
import { EventTypesService } from "./event-types.service";
import { calendars, resources, TIME_ZONE } from "./schedule";

const EVENT_PADDING_MS = 24 * 60 * 60 * 1000;
const SLOT_LOOKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SlotsService {
  @Inject(DATABASE)
  private readonly db: Database;

  @Inject(EventTypesService)
  private readonly eventTypes: EventTypesService;

  async list(
    from: Date,
    to: Date,
    executor: DatabaseExecutor = this.db,
  ): Promise<GenerateSlotsResult> {
    return generateSlots({
      rules: await this.eventTypes.listRules(executor),
      range: { start: toCivil(from, TIME_ZONE), end: toCivil(to, TIME_ZONE) },
      now: toCivil(new Date(), TIME_ZONE),
      timeZone: TIME_ZONE,
      calendars,
      resources,
      events: await this.occupyingEvents(from, to, executor),
    });
  }

  async find(
    ruleId: string,
    start: Date,
    executor: DatabaseExecutor = this.db,
  ): Promise<Slot | undefined> {
    const { slots } = await this.list(
      start,
      new Date(start.getTime() + SLOT_LOOKUP_WINDOW_MS),
      executor,
    );
    return slots.find(
      (slot) => slot.ruleId === ruleId && slot.startEpochMs === start.getTime(),
    );
  }

  private async occupyingEvents(
    from: Date,
    to: Date,
    executor: DatabaseExecutor,
  ): Promise<Array<SlotOccupyingEvent>> {
    const rows = await executor
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "confirmed"),
          lt(bookings.startAt, new Date(to.getTime() + EVENT_PADDING_MS)),
          gt(bookings.endAt, new Date(from.getTime() - EVENT_PADDING_MS)),
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
