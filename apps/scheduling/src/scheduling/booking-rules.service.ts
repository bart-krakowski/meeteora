import { Inject, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  BookingRules,
  BookingRulesSettings,
  RpcError,
  UpdateBookingRulesRequest,
} from "@meeteora/contracts";
import { availability, organizations } from "@meeteora/db";
import { eq } from "drizzle-orm";
import {
  DATABASE,
  type Database,
  type DatabaseExecutor,
} from "../database/database";
import { DEFAULT_BOOKING_RULES, TIME_ZONE } from "./schedule";

const DEFAULT_ORGANIZATION_SLUG = "default";

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

function integerIn(
  value: unknown,
  name: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw rpcError(400, `${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function validRules(request: UpdateBookingRulesRequest): BookingRulesSettings {
  return {
    slotStepMinutes:
      request.slotStepMinutes === null
        ? null
        : integerIn(request.slotStepMinutes, "slotStepMinutes", 5, 240),
    minNoticeMinutes: integerIn(
      request.minNoticeMinutes,
      "minNoticeMinutes",
      0,
      30 * 24 * 60,
    ),
    bufferAfterMinutes: integerIn(
      request.bufferAfterMinutes,
      "bufferAfterMinutes",
      0,
      240,
    ),
    maxHorizonDays: integerIn(request.maxHorizonDays, "maxHorizonDays", 1, 365),
  };
}

/** Slot rules shared by every resource and event type (stored in `availability`). */
@Injectable()
export class BookingRulesService {
  @Inject(DATABASE)
  private readonly db: Database;

  async get(): Promise<BookingRules> {
    return { timeZone: TIME_ZONE, ...(await this.settings()) };
  }

  async update(request: UpdateBookingRulesRequest): Promise<BookingRules> {
    const rules = validRules(request);
    const organizationId = await this.defaultOrganizationId(this.db);
    const values = { ...rules, updatedAt: new Date() };
    await this.db
      .insert(availability)
      .values({ organizationId, ...values })
      .onConflictDoUpdate({ target: availability.organizationId, set: values });
    return { timeZone: TIME_ZONE, ...rules };
  }

  /** Current rules as slot generation and booking checks read them. */
  async settings(
    executor: DatabaseExecutor = this.db,
  ): Promise<BookingRulesSettings> {
    const [row] = await executor
      .select({
        slotStepMinutes: availability.slotStepMinutes,
        minNoticeMinutes: availability.minNoticeMinutes,
        bufferAfterMinutes: availability.bufferAfterMinutes,
        maxHorizonDays: availability.maxHorizonDays,
      })
      .from(availability)
      .innerJoin(
        organizations,
        eq(organizations.id, availability.organizationId),
      )
      .where(eq(organizations.slug, DEFAULT_ORGANIZATION_SLUG));
    return row ?? DEFAULT_BOOKING_RULES;
  }

  private async defaultOrganizationId(
    executor: DatabaseExecutor,
  ): Promise<string> {
    const [organization] = await executor
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, DEFAULT_ORGANIZATION_SLUG));
    if (!organization) throw rpcError(500, "Default organization is missing");
    return organization.id;
  }
}
