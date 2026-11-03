import type {
  AppNotification,
  Booking,
  NotificationKind,
} from '@scheduler/contracts';

const TITLES: Record<NotificationKind, string> = {
  'booking.created': 'New booking',
  'booking.cancelled': 'Booking cancelled',
};

export function toNotification(
  kind: NotificationKind,
  booking: Booking,
  now: Date = new Date(),
): AppNotification {
  return {
    id: `${kind}:${booking.id}`,
    kind,
    title: TITLES[kind],
    booking,
    createdAt: now.toISOString(),
  };
}
