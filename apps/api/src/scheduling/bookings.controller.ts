import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { Attendee, Booking } from '@meeteora/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { parseDate } from './parse-date';
import { SchedulingClient } from './scheduling.client';

interface CreateBookingBody {
  ruleId?: unknown;
  start?: unknown;
  attendee?: { name?: unknown; email?: unknown };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAttendee(value: CreateBookingBody['attendee']): Attendee {
  const name = typeof value?.name === 'string' ? value.name.trim() : '';
  const email = typeof value?.email === 'string' ? value.email.trim() : '';
  if (!name) throw new BadRequestException('attendee.name must be a non-empty string');
  if (!EMAIL_PATTERN.test(email))
    throw new BadRequestException('attendee.email must be a valid email');
  return { name, email };
}

@Controller('bookings')
export class BookingsController {
  constructor(@Inject(SchedulingClient) private readonly scheduling: SchedulingClient) {}

  @Post()
  create(@Body() body: CreateBookingBody): Promise<Booking> {
    if (typeof body.ruleId !== 'string')
      throw new BadRequestException('ruleId must be a string');
    if (typeof body.start !== 'string')
      throw new BadRequestException('start must be a string');
    const start = parseDate(body.start);
    return this.scheduling.createBooking({
      ruleId: body.ruleId,
      start: start.toISOString(),
      attendee: parseAttendee(body.attendee),
    });
  }

  @Get()
  @UseGuards(AuthGuard)
  list(@Query('from') fromParam?: string): Promise<Array<Booking>> {
    const from = fromParam === undefined ? new Date() : parseDate(fromParam);
    return this.scheduling.listBookings({ from: from.toISOString() });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<Booking> {
    return this.scheduling.getBooking({ id });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  cancel(@Param('id', new ParseUUIDPipe()) id: string): Promise<Booking> {
    return this.scheduling.cancelBooking({ id });
  }
}
