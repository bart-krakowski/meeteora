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
  UseGuards,
} from '@nestjs/common';
import type { EventType } from '@meeteora/contracts';
import { AuthGuard } from '../auth/auth.guard';
import { SchedulingClient } from './scheduling.client';

interface CreateEventTypeBody {
  name?: unknown;
  slug?: unknown;
  durationMinutes?: unknown;
}

const SLUG_PATTERN = /^[a-z0-9-]+$/;

@Controller('event-types')
export class EventTypesController {
  constructor(
    @Inject(SchedulingClient) private readonly scheduling: SchedulingClient,
  ) {}

  @Get()
  list(): Promise<Array<EventType>> {
    return this.scheduling.listEventTypes();
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() body: CreateEventTypeBody): Promise<EventType> {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('name must be a non-empty string');
    }
    if (
      typeof body.durationMinutes !== 'number' ||
      !Number.isInteger(body.durationMinutes)
    ) {
      throw new BadRequestException('durationMinutes must be an integer');
    }
    if (
      body.slug !== undefined &&
      (typeof body.slug !== 'string' || !SLUG_PATTERN.test(body.slug))
    ) {
      throw new BadRequestException('slug must be kebab-case (a-z, 0-9, dashes)');
    }
    return this.scheduling.createEventType({
      name: body.name,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      durationMinutes: body.durationMinutes,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<EventType> {
    return this.scheduling.deleteEventType({ id });
  }
}
