import type {
  Booking,
  CreateBookingRequest,
  CreateEventTypeRequest,
  EventType,
  Resource,
} from "@meeteora/contracts";
import type { GenerateSlotsResult } from "@tanstack/time";
import { headers } from "next/headers";
import { ApiClient } from "./api-client";

/** Forwards the visitor's session cookie so the API can authenticate them. */
async function forwardCookie(): Promise<Record<string, string>> {
  const cookie = (await headers()).get("cookie");
  return cookie ? { cookie } : {};
}

const client = new ApiClient(
  process.env.API_URL ?? "http://localhost:3001",
  forwardCookie,
);

export const fetchSlots = () => client.get<GenerateSlotsResult>("/slots");

export const fetchBookings = (from: Date) =>
  client.get<Array<Booking>>("/bookings", { from: from.toISOString() });

export const createBooking = (input: CreateBookingRequest) =>
  client.post<Booking>("/bookings", input);

export const cancelBooking = (id: string) =>
  client.delete<Booking>(`/bookings/${encodeURIComponent(id)}`);

export const fetchEventTypes = () =>
  client.get<Array<EventType>>("/event-types");

export const createEventType = (input: CreateEventTypeRequest) =>
  client.post<EventType>("/event-types", input);

export const deleteEventType = (id: string) =>
  client.delete<EventType>(`/event-types/${encodeURIComponent(id)}`);

export const fetchResources = () => client.get<Array<Resource>>("/resources");

export const createResource = (name: string) =>
  client.post<Resource>("/resources", { name });

export const renameResource = (id: string, name: string) =>
  client.patch<Resource>(`/resources/${encodeURIComponent(id)}`, { name });

export const deleteResource = (id: string) =>
  client.delete<Resource>(`/resources/${encodeURIComponent(id)}`);
