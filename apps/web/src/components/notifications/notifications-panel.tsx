'use client';

import type { AppNotification } from '@scheduler/contracts';
import { Button } from '@scheduler/ui/components/button';
import { ScrollArea } from '@scheduler/ui/components/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@scheduler/ui/components/sheet';
import { cn } from '@scheduler/ui/lib/utils';
import { BellIcon, CalendarPlusIcon, CalendarXIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatRelative } from '@/lib/format';
import {
  describeNotification,
  useNotifications,
} from './notifications-provider';

const CLOCK_TICK_MS = 30_000;

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums">
      {count > 9 ? '9+' : count}
    </span>
  );
}

function NotificationItem({
  notification,
  unread,
  now,
}: {
  notification: AppNotification;
  unread: boolean;
  now: Date;
}) {
  const Icon =
    notification.kind === 'booking.cancelled'
      ? CalendarXIcon
      : CalendarPlusIcon;
  return (
    <li
      className={cn(
        'flex gap-3 border-b px-4 py-3 text-sm',
        unread && 'bg-muted/50',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium">{notification.title}</span>
          <time
            className="shrink-0 text-xs text-muted-foreground"
            dateTime={notification.createdAt}
          >
            {formatRelative(notification.createdAt, now)}
          </time>
        </div>
        <p className="text-muted-foreground">
          {describeNotification(notification)}
        </p>
      </div>
      {unread && (
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}
    </li>
  );
}

export function NotificationsPanel() {
  const { notifications, isUnread, unreadCount, markAllRead, clear } =
    useNotifications();
  const now = useNow();

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) markAllRead();
      }}
    >
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`Notifications, ${unreadCount} unread`}
          />
        }
      >
        <BellIcon />
        <UnreadBadge count={unreadCount} />
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  unread={isUnread(notification)}
                  now={now}
                />
              ))}
            </ul>
          )}
        </ScrollArea>
        <SheetFooter className="flex-row justify-end border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clear}
            disabled={notifications.length === 0}
          >
            Clear all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
