import type { MessageEvent } from '@nestjs/common';
import { firstValueFrom, take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NotificationsHub } from './notifications.hub';
import { NotificationsStreamController } from './notifications-stream.controller';
import { testBooking } from './test-bookings';
import { toNotification } from './to-notification';

function setup() {
  const hub = new NotificationsHub();
  hub.publish(toNotification('booking.created', testBooking('a')));
  hub.publish(toNotification('booking.created', testBooking('b')));
  return { hub, controller: new NotificationsStreamController(hub) };
}

function collect(events: Promise<Array<MessageEvent>>) {
  return events.then((list) => list.map(({ type, id }) => ({ type, id })));
}

describe('NotificationsStreamController', () => {
  it('starts a fresh connection with a snapshot, then streams live events', async () => {
    const { hub, controller } = setup();
    const events = firstValueFrom(controller.stream().pipe(take(2), toArray()));
    hub.publish(toNotification('booking.created', testBooking('c')));
    expect(await collect(events)).toEqual([
      { type: 'snapshot', id: 'booking.created:b' },
      { type: 'notification', id: 'booking.created:c' },
    ]);
  });

  it('replays missed events for a known last event id', async () => {
    const { controller } = setup();
    const events = firstValueFrom(
      controller.stream('booking.created:a').pipe(take(1), toArray()),
    );
    expect(await collect(events)).toEqual([
      { type: 'notification', id: 'booking.created:b' },
    ]);
  });

  it('gives an empty snapshot an empty id so the browser resets its last event id', async () => {
    const controller = new NotificationsStreamController(
      new NotificationsHub(),
    );
    const [event] = await firstValueFrom(
      controller.stream().pipe(take(1), toArray()),
    );
    expect(event).toMatchObject({ type: 'snapshot', id: '', data: [] });
  });

  it('falls back to a snapshot for an unknown last event id', async () => {
    const { controller } = setup();
    const [event] = await firstValueFrom(
      controller.stream('gone').pipe(take(1), toArray()),
    );
    expect(event.type).toBe('snapshot');
    expect(event.data).toHaveLength(2);
  });
});
