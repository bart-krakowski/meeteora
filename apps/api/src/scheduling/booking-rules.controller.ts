import type {
  BookingRules,
  UpdateBookingRulesRequest,
} from "@meeteora/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Put,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { SchedulingClient } from "./scheduling.client";

interface BookingRulesBody {
  slotStepMinutes?: unknown;
  minNoticeMinutes?: unknown;
  bufferAfterMinutes?: unknown;
  maxHorizonDays?: unknown;
}

function requireInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new BadRequestException(`${name} must be an integer`);
  }
  return value;
}

/** Type check only; the scheduling service checks the ranges. */
function requireRules(body: BookingRulesBody): UpdateBookingRulesRequest {
  return {
    slotStepMinutes:
      body.slotStepMinutes === null
        ? null
        : requireInteger(body.slotStepMinutes, "slotStepMinutes"),
    minNoticeMinutes: requireInteger(body.minNoticeMinutes, "minNoticeMinutes"),
    bufferAfterMinutes: requireInteger(
      body.bufferAfterMinutes,
      "bufferAfterMinutes",
    ),
    maxHorizonDays: requireInteger(body.maxHorizonDays, "maxHorizonDays"),
  };
}

@Controller("booking-rules")
@UseGuards(AuthGuard)
export class BookingRulesController {
  constructor(
    @Inject(SchedulingClient) private readonly scheduling: SchedulingClient,
  ) {}

  @Get()
  get(): Promise<BookingRules> {
    return this.scheduling.getBookingRules();
  }

  @Put()
  update(@Body() body: BookingRulesBody): Promise<BookingRules> {
    return this.scheduling.updateBookingRules(requireRules(body ?? {}));
  }
}
