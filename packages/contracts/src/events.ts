import type { Booking } from './scheduling';

export const Events = {
  bookingCreated: 'booking.created',
  bookingCancelled: 'booking.cancelled',
  bookingRescheduled: 'booking.rescheduled',
} as const;

export type BookingCreatedEvent = Booking;
export type BookingCancelledEvent = Booking;
export type BookingRescheduledEvent = Booking;
