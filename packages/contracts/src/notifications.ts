import type { Booking } from './scheduling';

export const NOTIFICATION_EVENT = 'notification';
export const NOTIFICATIONS_SNAPSHOT_EVENT = 'snapshot';

export type NotificationKind = 'booking.created' | 'booking.cancelled';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  booking: Booking;
  createdAt: string;
}
