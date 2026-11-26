import type {
  AppNotification,
  Booking,
  NotificationKind,
} from '@meeteora/contracts';

const TITLES: Record<NotificationKind, string> = {
  'booking.created': 'New booking',
  'booking.cancelled': 'Booking cancelled',
  'booking.rescheduled': 'Booking moved',
};

export function toNotification(
  kind: NotificationKind,
  booking: Booking,
  now: Date = new Date(),
): AppNotification {
  return {
    // A booking can move many times; key each move by its new start.
    id:
      kind === 'booking.rescheduled'
        ? `${kind}:${booking.id}:${booking.startAt}`
        : `${kind}:${booking.id}`,
    kind,
    title: TITLES[kind],
    booking,
    createdAt: now.toISOString(),
  };
}
