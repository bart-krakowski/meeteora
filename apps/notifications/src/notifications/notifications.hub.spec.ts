import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NotificationsHub, REPLAY_LIMIT } from './notifications.hub';
import { testBooking } from './test-bookings';
import { toNotification } from './to-notification';

function created(id: string) {
  return toNotification('booking.created', testBooking(id));
}

describe('NotificationsHub', () => {
  it('pushes new notifications to live subscribers', async () => {
    const hub = new NotificationsHub();
    const received = firstValueFrom(hub.live);
    hub.publish(created('a'));
    expect((await received).id).toBe('booking.created:a');
  });

  it('returns notifications missed since a known event id', () => {
    const hub = new NotificationsHub();
    hub.publish(created('a'));
    hub.publish(created('b'));
    hub.publish(toNotification('booking.cancelled', testBooking('a')));
    expect(hub.missedSince('booking.created:a')?.map(({ id }) => id)).toEqual([
      'booking.created:b',
      'booking.cancelled:a',
    ]);
  });

  it('returns undefined for an unknown event id', () => {
    const hub = new NotificationsHub();
    hub.publish(created('a'));
    expect(hub.missedSince('missing')).toBeUndefined();
  });

  it('ignores redelivered notifications', () => {
    const hub = new NotificationsHub();
    hub.publish(created('a'));
    hub.publish(created('a'));
    expect(hub.snapshot()).toHaveLength(1);
  });

  it('keeps only the most recent notifications', () => {
    const hub = new NotificationsHub();
    for (let index = 0; index <= REPLAY_LIMIT; index += 1) {
      hub.publish(created(String(index)));
    }
    const snapshot = hub.snapshot();
    expect(snapshot).toHaveLength(REPLAY_LIMIT);
    expect(snapshot[0].id).toBe('booking.created:1');
    expect(hub.missedSince('booking.created:0')).toBeUndefined();
  });
});
