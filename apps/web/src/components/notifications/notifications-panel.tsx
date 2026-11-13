"use client";

import type { AppNotification } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import {
  BellIcon,
  CalendarMinusIcon,
  CalendarPlusIcon,
} from "@meeteora/ui/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@meeteora/ui/components/popover";
import { ScrollArea } from "@meeteora/ui/components/scroll-area";
import { cn } from "@meeteora/ui/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatRelative, formatShortDateTime } from "@/lib/format";
import { useNotifications } from "./notifications-provider";

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
    <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 animate-in items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground tabular-nums ring-2 ring-sidebar zoom-in-50 duration-200">
      {count > 9 ? "9+" : count}
    </span>
  );
}

const KIND = {
  "booking.created": {
    Icon: CalendarPlusIcon,
    verb: "booked",
    href: "/bookings",
    chip: "bg-muted text-foreground",
  },
  "booking.cancelled": {
    Icon: CalendarMinusIcon,
    verb: "cancelled",
    href: "/bookings?view=cancelled",
    chip: "bg-destructive/10 text-destructive",
  },
} as const;

function NotificationItem({
  notification,
  unread,
  now,
  serviceName,
  onNavigate,
}: {
  notification: AppNotification;
  unread: boolean;
  now: Date;
  serviceName: string;
  onNavigate: () => void;
}) {
  const { booking } = notification;
  const kind = KIND[notification.kind];
  return (
    <li>
      <Link
        href={kind.href}
        onClick={onNavigate}
        className="group/item flex gap-3 px-4 py-3 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted/60"
      >
        <span
          className={cn(
            "relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            kind.chip,
          )}
        >
          <kind.Icon className="size-4" />
          {unread && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-popover">
              <span className="sr-only">Unread</span>
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <p
              className={cn(
                "min-w-0 truncate",
                unread ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span className="font-medium text-foreground">
                {booking.attendee.name}
              </span>{" "}
              {kind.verb} {serviceName}
            </p>
            <time
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
              dateTime={notification.createdAt}
              title={new Date(notification.createdAt).toLocaleString()}
            >
              {formatRelative(notification.createdAt, now)}
            </time>
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground tabular-nums",
              notification.kind === "booking.cancelled" && "line-through",
            )}
          >
            {formatShortDateTime(booking.startAt)}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BellIcon className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-medium">No notifications</p>
        <p className="text-xs text-muted-foreground">
          New and cancelled bookings show up here as they happen.
        </p>
      </div>
    </div>
  );
}

export function NotificationsPanel() {
  const { notifications, isUnread, unreadCount, markAllRead, clear, serviceName } =
    useNotifications();
  const now = useNow();
  const [open, setOpen] = useState(false);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
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
        <BellIcon />
        <UnreadBadge count={unreadCount} />
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-96 gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
          <div className="flex flex-col gap-0.5">
            <PopoverTitle>Notifications</PopoverTitle>
            <PopoverDescription className="text-xs">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </PopoverDescription>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="border-t">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <ScrollArea className="max-h-96">
              <ul className="divide-y divide-border/60">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    unread={isUnread(notification)}
                    now={now}
                    serviceName={serviceName(notification.booking.ruleId)}
                    onNavigate={() => changeOpen(false)}
                  />
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center justify-between border-t px-2 py-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/bookings" onClick={() => changeOpen(false)} />}
            >
              View all bookings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={clear}
            >
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
