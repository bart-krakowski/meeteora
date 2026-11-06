import "server-only";

import type {
  PublicEvent,
  RegistrationResult,
  RegistrationStatus,
} from "./types";

/**
 * In-memory event store. Public events have no backend service yet; this is
 * the seam to replace with a scheduling-service call once it does. Data lives
 * on globalThis so dev-server reloads keep registrations.
 */

interface StoredAttendee {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  waitlisted: boolean;
}

type StoredEvent = Omit<
  PublicEvent,
  "attendeeCount" | "recentAttendees" | "spotsLeft" | "status"
> & {
  attendees: Array<StoredAttendee>;
  /** Set by the organizer to stop registrations early. */
  registrationOpen: boolean;
};

export class RegistrationError extends Error {
  constructor(
    readonly code: "not_found" | "closed" | "duplicate",
    message: string,
  ) {
    super(message);
  }
}

const SEED_NAMES = [
  "Ola Nowak", "Marek Zieliński", "Hana Sato", "Jonas Berg", "Amira Haddad",
  "Piotr Wiśniewski", "Lena Fischer", "Tomás Rivera", "Kasia Lewandowska",
  "Noah Clarke", "Ines Duarte", "Bartek Kamiński", "Maya Cohen", "Elif Yılmaz",
  "Jan Kowalczyk", "Sofia Rossi", "Adam Wójcik", "Nora Lindqvist",
];

function seedAttendees(count: number, prefix: string): Array<StoredAttendee> {
  return Array.from({ length: count }, (_, index) => {
    const name = SEED_NAMES[index % SEED_NAMES.length];
    return {
      id: `${prefix}-${index}`,
      name,
      email: `guest${index}@${prefix}.example`,
      joinedAt: new Date(Date.UTC(2026, 9, 1) + index * 3_600_000).toISOString(),
      waitlisted: false,
    };
  });
}

function seed(): Map<string, StoredEvent> {
  const events: Array<StoredEvent> = [
    {
      slug: "the-grid-is-a-promise",
      category: "Talk & supper",
      title: "The Grid Is a Promise",
      description:
        "An evening on Swiss typography and the quiet discipline of layout. Three short talks, one long table, and a printed keepsake for every guest.",
      startsAt: "2026-12-03T18:00:00.000Z",
      endsAt: "2026-12-03T21:30:00.000Z",
      timeZone: "Europe/Warsaw",
      location: { venue: "Studio Kolonia", area: "Puławska, Mokotów", city: "Warsaw" },
      organizer: {
        name: "Forma Studio",
        bio: "Independent type and editorial design studio.",
        url: "https://forma.example",
      },
      price: { amount: 6000, currency: "PLN", note: "Paid at the door. Supper included." },
      capacity: 80,
      cover: {
        src: "/events/photo-c822-1280.jpg",
        alt: "Two sharpened pencils lying diagonally on a flat paper ground",
        credit: "Photograph: Joanna Kosinska, CC0, via Wikimedia Commons",
      },
      registrationClosesAt: "2026-12-02T22:59:00.000Z",
      registrationOpen: true,
      attendees: seedAttendees(54, "grid"),
    },
    {
      slug: "small-press-night",
      category: "Book fair",
      title: "Small Press Night",
      description:
        "Twelve independent publishers, one room, and the year's best-made books on open tables.",
      startsAt: "2026-11-20T17:00:00.000Z",
      endsAt: "2026-11-20T21:00:00.000Z",
      timeZone: "Europe/Warsaw",
      location: { venue: "Hala Koszyki", area: "Koszykowa, Śródmieście", city: "Warsaw" },
      organizer: { name: "Paper Weight Collective" },
      price: null,
      capacity: 40,
      cover: null,
      registrationClosesAt: "2026-11-20T15:00:00.000Z",
      registrationOpen: true,
      attendees: seedAttendees(40, "press"),
    },
  ];
  return new Map(events.map((event) => [event.slug, event]));
}

const globalStore = globalThis as { publicEventStore?: Map<string, StoredEvent> };
const store = (globalStore.publicEventStore ??= seed());

function statusOf(event: StoredEvent, now: Date): RegistrationStatus {
  const closes = Math.min(
    Date.parse(event.registrationClosesAt),
    Date.parse(event.startsAt),
  );
  if (!event.registrationOpen || now.getTime() >= closes) return "closed";
  if (event.capacity !== null && confirmed(event).length >= event.capacity) {
    return "waitlist";
  }
  return "open";
}

function confirmed(event: StoredEvent): Array<StoredAttendee> {
  return event.attendees.filter((attendee) => !attendee.waitlisted);
}

function toPublic(event: StoredEvent, now = new Date()): PublicEvent {
  const { attendees: _attendees, registrationOpen: _open, ...rest } = event;
  const going = confirmed(event);
  return {
    ...rest,
    attendeeCount: going.length,
    recentAttendees: going
      .slice(-5)
      .toReversed()
      .map(({ id, name }) => ({ id, name })),
    spotsLeft:
      event.capacity === null ? null : Math.max(0, event.capacity - going.length),
    status: statusOf(event, now),
  };
}

export function listPublicEvents(): Array<PublicEvent> {
  return [...store.values()].map((event) => toPublic(event));
}

export function getPublicEvent(slug: string): PublicEvent | null {
  const event = store.get(slug);
  return event ? toPublic(event) : null;
}

export function registerForEvent(
  slug: string,
  input: { name: string; email: string },
): RegistrationResult {
  const event = store.get(slug);
  if (!event) throw new RegistrationError("not_found", "Event not found.");

  const status = statusOf(event, new Date());
  if (status === "closed") {
    throw new RegistrationError("closed", "Registration for this event has closed.");
  }

  const email = input.email.trim().toLowerCase();
  if (event.attendees.some((attendee) => attendee.email === email)) {
    throw new RegistrationError("duplicate", "This email is already on the guest list.");
  }

  const attendee: StoredAttendee = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email,
    joinedAt: new Date().toISOString(),
    waitlisted: status === "waitlist",
  };
  event.attendees.push(attendee);

  return {
    outcome: attendee.waitlisted ? "waitlisted" : "confirmed",
    attendee: { id: attendee.id, name: attendee.name },
  };
}
