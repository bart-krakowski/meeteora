import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  type CreateEventTypeRequest,
  type EventType,
  type EventTypeIdRequest,
  SchedulingPatterns,
} from '@scheduler/contracts';
import { EventTypesService } from './event-types.service';

@Controller()
export class EventTypesController {
  constructor(
    @Inject(EventTypesService) private readonly eventTypes: EventTypesService,
  ) {}

  @MessagePattern(SchedulingPatterns.listEventTypes)
  list(): Promise<Array<EventType>> {
    return this.eventTypes.list();
  }

  @MessagePattern(SchedulingPatterns.createEventType)
  create(@Payload() request: CreateEventTypeRequest): Promise<EventType> {
    return this.eventTypes.create(request);
  }

  @MessagePattern(SchedulingPatterns.deleteEventType)
  delete(@Payload() request: EventTypeIdRequest): Promise<EventType> {
    return this.eventTypes.delete(request);
  }
}
