import type { Booking } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@meeteora/ui/components/card";
import Link from "next/link";
import { connection } from "next/server";
import { api } from "@/trpc/server";
import { BookingsTable } from "@/components/bookings/bookings-table";
import { PageBody, PageHeader } from "@/components/page-header";
import { TIME_ZONE } from "@/lib/format";

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

function summarize(bookings: Array<Booking>, now: Date) {
  const confirmed = bookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const today = dayFormat.format(now);
  return {
    upcoming: confirmed.length,
    today: confirmed.filter(
      (booking) => dayFormat.format(new Date(booking.startAt)) === today,
    ).length,
    cancelled: bookings.length - confirmed.length,
  };
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

export default async function OverviewPage() {
  await connection();
  const now = new Date();
  const [bookings, { slots }, eventTypes, resources] = await Promise.all([
    api.bookings.list({ from: now.toISOString() }),
    api.slots.list(),
    api.eventTypes.list(),
    api.resources.list(),
  ]);
  const eventTypeNames = new Map(
    eventTypes.map((eventType) => [eventType.id, eventType.name]),
  );
  const resourceNames = new Map(
    resources.map((resource) => [resource.id, resource.name]),
  );
  const stats = summarize(bookings, now);

  return (
    <PageBody>
      <PageHeader title="Overview" description="Today's numbers and what's coming up." />
      <section className="grid grid-cols-2 gap-4 @xl/main:grid-cols-4">
        <StatCard title="Upcoming" value={stats.upcoming} />
        <StatCard title="Today" value={stats.today} />
        <StatCard title="Cancelled" value={stats.cancelled} />
        <StatCard title="Open slots (7 days)" value={slots.length} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-base font-medium">Upcoming bookings</h2>
            <p className="text-sm text-muted-foreground">
              Confirmed appointments, {TIME_ZONE} time.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/bookings" />}
          >
            View all
          </Button>
        </div>
        <BookingsTable
          bookings={bookings.filter((booking) => booking.status === "confirmed")}
          eventTypeNames={eventTypeNames}
          resourceNames={resourceNames}
          now={now}
          emptyMessage="No upcoming bookings."
        />
      </section>
    </PageBody>
  );
}
