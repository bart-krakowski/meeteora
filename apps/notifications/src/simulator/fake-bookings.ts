import { randomUUID } from 'node:crypto';
import type { Booking } from '@scheduler/contracts';

const ATTENDEES = [
  { name: 'Ada Lovelace', email: 'ada@example.com' },
  { name: 'Alan Turing', email: 'alan@example.com' },
  { name: 'Grace Hopper', email: 'grace@example.com' },
  { name: 'Katherine Johnson', email: 'katherine@example.com' },
  { name: 'Linus Torvalds', email: 'linus@example.com' },
];

const SLOT_MS = 30 * 60 * 1000;
const HORIZON_SLOTS = 7 * 48;

function pick<T>(items: Array<T>): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function fakeBooking(now: Date = new Date()): Booking {
  const nextSlot = Math.ceil(now.getTime() / SLOT_MS) * SLOT_MS;
  const start = nextSlot + Math.floor(Math.random() * HORIZON_SLOTS) * SLOT_MS;
  return {
    id: randomUUID(),
    ruleId: 'intro-call',
    resourceId: 'host-1',
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + SLOT_MS).toISOString(),
    status: 'confirmed',
    attendee: pick(ATTENDEES),
  };
}

export function cancelled(booking: Booking): Booking {
  return { ...booking, status: 'cancelled' };
}
