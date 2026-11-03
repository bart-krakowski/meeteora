import {
  Controller,
  Headers,
  Inject,
  type MessageEvent,
  Sse,
} from '@nestjs/common';
import {
  type AppNotification,
  NOTIFICATION_EVENT,
  NOTIFICATIONS_SNAPSHOT_EVENT,
} from '@scheduler/contracts';
import {
  concat,
  defer,
  from,
  interval,
  map,
  merge,
  type Observable,
  of,
} from 'rxjs';
import { NotificationsHub } from './notifications.hub';

const HEARTBEAT_MS = 25_000;

function notificationEvent(notification: AppNotification): MessageEvent {
  return { id: notification.id, type: NOTIFICATION_EVENT, data: notification };
}

function snapshotEvent(notifications: Array<AppNotification>): MessageEvent {
  return {
    id: notifications.at(-1)?.id ?? '',
    type: NOTIFICATIONS_SNAPSHOT_EVENT,
    data: notifications,
  };
}

@Controller('notifications')
export class NotificationsStreamController {
  constructor(
    @Inject(NotificationsHub) private readonly hub: NotificationsHub,
  ) {}

  @Sse('stream')
  stream(
    @Headers('last-event-id') lastEventId?: string,
  ): Observable<MessageEvent> {
    const notifications = defer(() => {
      const missed = lastEventId
        ? this.hub.missedSince(lastEventId)
        : undefined;
      const head = missed
        ? from(missed.map(notificationEvent))
        : of(snapshotEvent(this.hub.snapshot()));
      return concat(head, this.hub.live.pipe(map(notificationEvent)));
    });
    const heartbeats = interval(HEARTBEAT_MS).pipe(
      map((): MessageEvent => ({ comment: 'ping' })),
    );
    return merge(notifications, heartbeats);
  }
}
