import type { Booking } from './scheduling';

export const Events = {
  bookingCreated: 'booking.created',
  bookingCancelled: 'booking.cancelled',
} as const;

export type BookingCreatedEvent = Booking;
export type BookingCancelledEvent = Booking;
