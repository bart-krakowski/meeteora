/** Tabs of the bookings page; shared by the server page and the client view. */

export const BOOKING_VIEWS = {
  upcoming: {
    label: "Upcoming",
    description: "Confirmed bookings that haven't started, soonest first.",
    empty: "No upcoming bookings.",
  },
  past: {
    label: "Past",
    description: "Confirmed bookings that have already started, most recent first.",
    empty: "No past bookings.",
  },
  cancelled: {
    label: "Cancelled",
    description: "Cancelled bookings, most recent first.",
    empty: "No cancelled bookings.",
  },
} as const;

export type BookingView = keyof typeof BOOKING_VIEWS;

export const BOOKING_VIEW_ORDER: ReadonlyArray<BookingView> = ["upcoming", "past", "cancelled"];

/** Earliest date asked of the API, so past bookings are included. */
export const HISTORY_START = new Date("2000-01-01T00:00:00Z").toISOString();

export const isBookingView = (value: unknown): value is BookingView =>
  typeof value === "string" && value in BOOKING_VIEWS;
