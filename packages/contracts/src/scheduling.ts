import type { GenerateSlotsResult } from "@tanstack/time";

export const SchedulingPatterns = {
  health: "scheduling.health",
  listSlots: "slots.list",
  createBooking: "bookings.create",
  listBookings: "bookings.list",
  getBooking: "bookings.get",
  cancelBooking: "bookings.cancel",
  listEventTypes: "event-types.list",
  createEventType: "event-types.create",
  deleteEventType: "event-types.delete",
} as const;

export interface ListSlotsRequest {
  from: string;
  to: string;
}

export type ListSlotsResponse = GenerateSlotsResult;

export interface Attendee {
  name: string;
  email: string;
}

export interface CreateBookingRequest {
  ruleId: string;
  start: string;
  attendee: Attendee;
}

export interface ListBookingsRequest {
  from: string;
}

export interface BookingIdRequest {
  id: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  ruleId: string;
  resourceId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  attendee: Attendee;
}

export interface EventType {
  id: string;
  slug: string;
  name: string;
  durationMinutes: number;
}

export interface CreateEventTypeRequest {
  name: string;
  slug?: string;
  durationMinutes: number;
}

export interface EventTypeIdRequest {
  id: string;
}

export interface HealthResponse {
  status: "ok";
}

export interface RpcError {
  status: number;
  message: string;
}
