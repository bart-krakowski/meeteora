import type { Booking } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import Link from "next/link";
import { connection } from "next/server";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { PageBody, PageHeader } from "@/components/page-header";
import { TIME_ZONE } from "@/lib/format";
import { api } from "@/trpc/server";

const VIEWS = {
  upcoming: {
    label: "Upcoming",
    description: "Confirmed bookings that haven't started, soonest first.",
    empty: "No upcoming bookings.",
  },
  past: {
    label: "Past",
    description: "Confirmed bookings that have already started, most recent first.",
    empty: "No past bookings.",
  },
  cancelled: {
    label: "Cancelled",
    description: "Cancelled bookings, most recent first.",
    empty: "No cancelled bookings.",
  },
} as const;

type View = keyof typeof VIEWS;

const isView = (value: unknown): value is View =>
  typeof value === "string" && value in VIEWS;

/** Earliest date asked of the API, so past bookings are included. */
const HISTORY_START = new Date("2000-01-01T00:00:00Z").toISOString();

const byStart = (a: Booking, b: Booking) => a.startAt.localeCompare(b.startAt);

function split(bookings: Array<Booking>, now: Date): Record<View, Array<Booking>> {
  const nowIso = now.toISOString();
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  return {
    upcoming: confirmed.filter((booking) => booking.startAt >= nowIso).sort(byStart),
    past: confirmed
      .filter((booking) => booking.startAt < nowIso)
      .sort(byStart)
      .reverse(),
    cancelled: bookings
      .filter((booking) => booking.status !== "confirmed")
      .sort(byStart)
      .reverse(),
  };
}

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  await connection();
  const { view: viewParam } = await searchParams;
  const view: View = isView(viewParam) ? viewParam : "upcoming";
  const now = new Date();

  const [bookings, eventTypes, resources] = await Promise.all([
    api.bookings.list({ from: HISTORY_START }),
    api.eventTypes.list(),
    api.resources.list(),
  ]);
  const eventTypeNames = new Map(
    eventTypes.map((eventType) => [eventType.id, eventType.name]),
  );
  const resourceNames = new Map(
    resources.map((resource) => [resource.id, resource.name]),
  );
  const groups = split(bookings, now);

  return (
    <PageBody>
      <PageHeader
        title="Bookings"
        description={`${VIEWS[view].description} Times in ${TIME_ZONE}.`}
      />
      <div className="flex flex-col gap-3">
        <nav aria-label="Booking views" className="flex flex-wrap gap-1">
          {(Object.keys(VIEWS) as Array<View>).map((key) => (
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
              {VIEWS[key].label}
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
          emptyMessage={VIEWS[view].empty}
        />
      </div>
    </PageBody>
  );
}
