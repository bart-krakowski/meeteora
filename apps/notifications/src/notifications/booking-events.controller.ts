import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import {
  type BookingCancelledEvent,
  type BookingCreatedEvent,
  Events,
} from '@meeteora/contracts';
import { NotificationsHub } from './notifications.hub';
import { toNotification } from './to-notification';

@Controller()
export class BookingEventsController {
  constructor(
    @Inject(NotificationsHub) private readonly hub: NotificationsHub,
  ) {}

  @EventPattern<string>(Events.bookingCreated)
  onBookingCreated(@Payload() booking: BookingCreatedEvent): void {
    this.hub.publish(toNotification('booking.created', booking));
  }

  @EventPattern<string>(Events.bookingCancelled)
  onBookingCancelled(@Payload() booking: BookingCancelledEvent): void {
    this.hub.publish(toNotification('booking.cancelled', booking));
  }
}
