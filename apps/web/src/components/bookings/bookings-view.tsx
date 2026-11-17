"use client";

import type { Booking } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { useBookingNames } from "@/components/bookings/use-booking-names";
import { PageBody, PageHeader } from "@/components/page-header";
import { TIME_ZONE } from "@/lib/format";
import { useTRPC } from "@/trpc/provider";
import {
  BOOKING_VIEW_ORDER,
  BOOKING_VIEWS,
  type BookingView,
  HISTORY_START,
} from "./booking-views";

const byStart = (a: Booking, b: Booking) => a.startAt.localeCompare(b.startAt);

function split(
  bookings: Array<Booking>,
  nowIso: string,
): Record<BookingView, Array<Booking>> {
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  return {
    upcoming: confirmed.filter((booking) => booking.startAt >= nowIso).toSorted(byStart),
    past: confirmed
      .filter((booking) => booking.startAt < nowIso)
      .toSorted(byStart)
      .toReversed(),
    cancelled: bookings
      .filter((booking) => booking.status !== "confirmed")
      .toSorted(byStart)
      .toReversed(),
  };
}

/** `now` is the request time as ISO, so server and client split alike. */
export function BookingsView({ view, now: nowIso }: { view: BookingView; now: string }) {
  const trpc = useTRPC();
  const { data: bookings } = useSuspenseQuery(
    trpc.bookings.list.queryOptions({ from: HISTORY_START }),
  );
  const { eventTypeNames, resourceNames } = useBookingNames();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const groups = useMemo(() => split(bookings, nowIso), [bookings, nowIso]);

  return (
    <PageBody>
      <PageHeader
        title="Bookings"
        description={`${BOOKING_VIEWS[view].description} Times in ${TIME_ZONE}.`}
      />
      <div className="flex flex-col gap-3">
        <nav aria-label="Booking views" className="flex flex-wrap gap-1">
          {BOOKING_VIEW_ORDER.map((key) => (
            <Button
              key={key}
              nativeButton={false}
              variant={key === view ? "secondary" : "ghost"}
              size="sm"
              aria-current={key === view ? "page" : undefined}
              render={
                <Link href={key === "upcoming" ? "/bookings" : `/bookings?view=${key}`} />
              }
            >
              {BOOKING_VIEWS[key].label}
              <span className="text-muted-foreground tabular-nums">
                {groups[key].length}
              </span>
            </Button>
          ))}
        </nav>
        <BookingsTable
          bookings={groups[view]}
          eventTypeNames={eventTypeNames}
          resourceNames={resourceNames}
          now={now}
          emptyMessage={BOOKING_VIEWS[view].empty}
        />
      </div>
    </PageBody>
  );
}
