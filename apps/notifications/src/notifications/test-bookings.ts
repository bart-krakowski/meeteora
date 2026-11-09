import type { Booking } from '@meeteora/contracts';

export function testBooking(id: string): Booking {
  return {
    id,
    ruleId: 'intro-call',
    resourceId: 'host-1',
    startAt: '2026-11-03T09:00:00.000Z',
    endAt: '2026-11-03T09:30:00.000Z',
    status: 'confirmed',
    attendee: { name: 'Ada', email: 'ada@example.com' },
  };
}
