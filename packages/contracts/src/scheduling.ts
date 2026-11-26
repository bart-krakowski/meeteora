import type { GenerateSlotsResult } from "@tanstack/time";

export const SchedulingPatterns = {
  health: "scheduling.health",
  listSlots: "slots.list",
  createBooking: "bookings.create",
  listBookings: "bookings.list",
  getBooking: "bookings.get",
  cancelBooking: "bookings.cancel",
  rescheduleBooking: "bookings.reschedule",
  listEventTypes: "event-types.list",
  createEventType: "event-types.create",
  deleteEventType: "event-types.delete",
  listResources: "resources.list",
  createResource: "resources.create",
  updateResource: "resources.update",
  deleteResource: "resources.delete",
  getBookingRules: "booking-rules.get",
  updateBookingRules: "booking-rules.update",
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

/** Moves a confirmed booking to a new start, keeping its event type and host. */
export interface RescheduleBookingRequest {
  id: string;
  start: string;
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

/** Who or what a booking is held by, e.g. a host. Bookings store its id as `resourceId`. */
export interface Resource extends ResourceHours {
  id: string;
  name: string;
  /** How many bookings may overlap on this resource at once (at least 1). */
  capacity: number;
}

export interface CreateResourceRequest {
  name: string;
  /** Defaults to 1. */
  capacity?: number;
}

/** Changes only the fields that are given. */
export interface UpdateResourceRequest extends Partial<ResourceHours> {
  id: string;
  name?: string;
  capacity?: number;
}

export interface ResourceIdRequest {
  id: string;
}

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** Wall-clock "HH:MM" in the organization's time zone; `end` may be "24:00". */
export interface TimeRange {
  start: string;
  end: string;
}

/** Open hours per weekday; an empty list means closed that day. */
export type WeeklyHours = Record<Weekday, Array<TimeRange>>;

/** When one resource can be booked, read in the organization's time zone. */
export interface ResourceHours {
  weekly: WeeklyHours;
  /** Whole days closed, as "YYYY-MM-DD". */
  daysOff: Array<string>;
}

/** Rules every slot follows, shared by all resources and event types. */
export interface BookingRulesSettings {
  /** Minutes between slot starts; null means "every event length". */
  slotStepMinutes: number | null;
  /** How far ahead of now a booking must start. */
  minNoticeMinutes: number;
  /** Gap kept free after each booking. */
  bufferAfterMinutes: number;
  /** How many days ahead slots are offered. */
  maxHorizonDays: number;
}

export interface BookingRules extends BookingRulesSettings {
  /** IANA zone resource hours and days off are read in. */
  timeZone: string;
}

export type UpdateBookingRulesRequest = BookingRulesSettings;

export interface HealthResponse {
  status: "ok";
}

export interface RpcError {
  status: number;
  message: string;
}
