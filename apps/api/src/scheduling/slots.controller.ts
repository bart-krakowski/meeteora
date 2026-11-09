import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { ListSlotsResponse } from '@meeteora/contracts';
import { parseDate } from './parse-date';
import { SchedulingClient } from './scheduling.client';

const DEFAULT_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

@Controller('slots')
export class SlotsController {
  constructor(@Inject(SchedulingClient) private readonly scheduling: SchedulingClient) {}

  @Get()
  list(
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
  ): Promise<ListSlotsResponse> {
    const from = fromParam === undefined ? new Date() : parseDate(fromParam);
    const to =
      toParam === undefined
        ? new Date(from.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS)
        : parseDate(toParam);
    return this.scheduling.listSlots({
      from: from.toISOString(),
      to: to.toISOString(),
    });
  }
}
