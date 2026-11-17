import { connection } from "next/server";
import { CalendarViewClient } from "@/components/calendar/calendar-view-client";
import type { CalendarBooking } from "@/components/calendar/calendar-view";
import { api } from "@/trpc/server";

const HISTORY_START = new Date("2000-01-01T00:00:00Z").toISOString();

export default async function CalendarPage() {
  await connection();
  const [resources, bookings, eventTypes] = await Promise.all([
    api.resources.list(),
    api.bookings.list({ from: HISTORY_START }),
    api.eventTypes.list(),
  ]);

  const eventTypeNames = new Map(
    eventTypes.map((eventType) => [eventType.id, eventType.name]),
  );
  const calendarBookings: Array<CalendarBooking> = bookings.map((booking) => ({
    id: booking.id,
    resourceId: booking.resourceId,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    title: `${eventTypeNames.get(booking.ruleId) ?? "Booking"} · ${booking.attendee.name}`,
  }));

  return (
    <CalendarViewClient
      resources={resources.map(({ id, name }) => ({ id, name }))}
      bookings={calendarBookings}
    />
  );
}
