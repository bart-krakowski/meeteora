import { Injectable } from '@nestjs/common';
import type { AppNotification } from '@meeteora/contracts';
import { type Observable, Subject } from 'rxjs';

export const REPLAY_LIMIT = 100;

@Injectable()
export class NotificationsHub {
  private readonly recent: Array<AppNotification> = [];
  private readonly published = new Subject<AppNotification>();

  readonly live: Observable<AppNotification> = this.published.asObservable();

  publish(notification: AppNotification): void {
    if (this.recent.some(({ id }) => id === notification.id)) return;
    this.recent.push(notification);
    if (this.recent.length > REPLAY_LIMIT) this.recent.shift();
    this.published.next(notification);
  }

  snapshot(): Array<AppNotification> {
    return [...this.recent];
  }

  missedSince(lastEventId: string): Array<AppNotification> | undefined {
    const index = this.recent.findIndex(({ id }) => id === lastEventId);
    return index === -1 ? undefined : this.recent.slice(index + 1);
  }
}
