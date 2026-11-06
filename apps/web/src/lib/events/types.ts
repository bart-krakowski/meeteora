/** A public, shareable event (an invitation page at /e/[slug]). */

export interface EventPrice {
  /** Minor units (grosze, cents). */
  amount: number;
  currency: string;
  /** How the ticket is paid, shown in the registration modal. */
  note?: string;
}

export interface EventOrganizer {
  name: string;
  bio?: string;
  url?: string;
}

export interface EventLocation {
  venue: string;
  /** Street and district, no house number. */
  area: string;
  city: string;
}

export interface EventCover {
  src: string;
  alt: string;
  credit?: string;
}

/** Registration state shown to visitors. */
export type RegistrationStatus = "open" | "waitlist" | "closed";

/** The attendee shape visitors may see: no emails. */
export interface PublicAttendee {
  id: string;
  name: string;
}

export interface PublicEvent {
  slug: string;
  category: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  location: EventLocation;
  organizer: EventOrganizer;
  /** null when the event is free. */
  price: EventPrice | null;
  /** null when attendance is unlimited. */
  capacity: number | null;
  cover: EventCover | null;
  attendeeCount: number;
  /** The most recent attendees, newest first, at most 5. */
  recentAttendees: Array<PublicAttendee>;
  spotsLeft: number | null;
  status: RegistrationStatus;
  registrationClosesAt: string;
}

export type RegistrationOutcome = "confirmed" | "waitlisted";

export interface RegistrationResult {
  outcome: RegistrationOutcome;
  attendee: PublicAttendee;
}
