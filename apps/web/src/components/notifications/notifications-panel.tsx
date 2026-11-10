"use client";

import type { AppNotification } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import { ScrollArea } from "@meeteora/ui/components/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverFooter,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@meeteora/ui/components/popover";
import { cn } from "@meeteora/ui/lib/utils";
import {
  BellIcon,
  CalendarAdd01Icon,
  CalendarRemove01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/format";
import {
  describeNotification,
  useNotifications,
} from "./notifications-provider";

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
      {count > 9 ? "9+" : count}
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
  const icon =
    notification.kind === "booking.cancelled"
      ? CalendarRemove01Icon
      : CalendarAdd01Icon;
  return (
    <li className={cn("flex gap-3 px-4 py-3 text-sm", unread && "bg-muted/50")}>
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
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
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
    </li>
  );
}

export function NotificationsPanel() {
  const { notifications, isUnread, unreadCount, markAllRead, clear } =
    useNotifications();
  const now = useNow();

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) markAllRead();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={`Notifications, ${unreadCount} unread`}
          />
        }
      >
        <HugeiconsIcon icon={BellIcon} strokeWidth={2} />
        <UnreadBadge count={unreadCount} />
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 divide-y">
        <PopoverHeader>
          <PopoverTitle>Notifications</PopoverTitle>
          <PopoverDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </PopoverDescription>
        </PopoverHeader>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y">
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
        <PopoverFooter className="flex-row justify-end">
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
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  );
}
