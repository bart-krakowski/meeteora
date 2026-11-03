'use client';

import {
  type AppNotification,
  NOTIFICATION_EVENT,
  NOTIFICATIONS_SNAPSHOT_EVENT,
} from '@scheduler/contracts';
import { toast } from '@scheduler/ui/components/sonner';
import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { formatDateTime } from '@/lib/format';

const STREAM_URL = '/notifications/stream';
const STORAGE_KEY = 'scheduler.notifications';
const MAX_NOTIFICATIONS = 100;

interface Markers {
  readAt: string;
  clearedAt: string;
}

interface NotificationsContextValue {
  notifications: Array<AppNotification>;
  isUnread: (notification: AppNotification) => boolean;
  unreadCount: number;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function useNotifications(): NotificationsContextValue {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error(
      'useNotifications must be used within NotificationsProvider',
    );
  }
  return value;
}

export function describeNotification({ booking }: AppNotification): string {
  return `${booking.attendee.name} · ${booking.ruleId} · ${formatDateTime(booking.startAt)}`;
}

function readMarkers(): Markers {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { readAt: stored.readAt ?? '', clearedAt: stored.clearedAt ?? '' };
  } catch {
    return { readAt: '', clearedAt: '' };
  }
}

function newestFirst(
  notifications: Array<AppNotification>,
): Array<AppNotification> {
  return [...notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_NOTIFICATIONS);
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [received, setReceived] = useState<Array<AppNotification>>([]);
  const [markers, setMarkers] = useState<Markers>({
    readAt: '',
    clearedAt: '',
  });

  useEffect(() => setMarkers(readMarkers()), []);

  useEffect(() => {
    const source = new EventSource(STREAM_URL);
    const onSnapshot = (event: MessageEvent<string>) => {
      setReceived(newestFirst(JSON.parse(event.data)));
    };
    const onNotification = (event: MessageEvent<string>) => {
      const notification: AppNotification = JSON.parse(event.data);
      setReceived((current) =>
        current.some(({ id }) => id === notification.id)
          ? current
          : newestFirst([notification, ...current]),
      );
      toast(notification.title, {
        description: describeNotification(notification),
      });
      router.refresh();
    };
    source.addEventListener(NOTIFICATIONS_SNAPSHOT_EVENT, onSnapshot);
    source.addEventListener(NOTIFICATION_EVENT, onNotification);
    return () => {
      source.removeEventListener(NOTIFICATIONS_SNAPSHOT_EVENT, onSnapshot);
      source.removeEventListener(NOTIFICATION_EVENT, onNotification);
      source.close();
    };
  }, [router]);

  const updateMarkers = useCallback(
    (update: (latest: string) => Partial<Markers>) => {
      setMarkers((current) => {
        const latest = [new Date().toISOString(), received[0]?.createdAt ?? '']
          .sort()
          .at(-1) as string;
        const next = { ...current, ...update(latest) };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [received],
  );

  const value = useMemo<NotificationsContextValue>(() => {
    const notifications = received.filter(
      ({ createdAt }) => createdAt > markers.clearedAt,
    );
    const isUnread = ({ createdAt }: AppNotification) =>
      createdAt > markers.readAt;
    return {
      notifications,
      isUnread,
      unreadCount: notifications.filter(isUnread).length,
      markAllRead: () => updateMarkers((latest) => ({ readAt: latest })),
      clear: () =>
        updateMarkers((latest) => ({ readAt: latest, clearedAt: latest })),
    };
  }, [received, markers, updateMarkers]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
