import type { Booking } from "@scheduler/contracts";
import { Badge } from "@scheduler/ui/components/badge";
import { Button } from "@scheduler/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@scheduler/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@scheduler/ui/components/table";
import { connection } from "next/server";
import { api } from "@/trpc/server";
import { formatDateTime, TIME_ZONE } from "@/lib/format";
import { cancelBookingAction } from "./actions";

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

function BookingRow({
  booking,
  eventTypeNames,
}: {
  booking: Booking;
  eventTypeNames: ReadonlyMap<string, string>;
}) {
  return (
    <TableRow>
      <TableCell>{formatDateTime(booking.startAt)}</TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span>{booking.attendee.name}</span>
          <span className="text-xs text-muted-foreground">
            {booking.attendee.email}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {eventTypeNames.get(booking.ruleId) ?? booking.ruleId}
      </TableCell>
      <TableCell>{booking.resourceId}</TableCell>
      <TableCell>
        <Badge
          variant={booking.status === "confirmed" ? "default" : "secondary"}
        >
          {booking.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {booking.status === "confirmed" && (
          <form action={cancelBookingAction}>
            <input type="hidden" name="id" value={booking.id} />
            <Button type="submit" variant="destructive" size="sm">
              Cancel
            </Button>
          </form>
        )}
      </TableCell>
    </TableRow>
  );
}

export default async function OverviewPage() {
  await connection();
  const now = new Date();
  const [bookings, { slots }, eventTypes] = await Promise.all([
    api.bookings.list({ from: now.toISOString() }),
    api.slots.list(),
    api.eventTypes.list(),
  ]);
  const eventTypeNames = new Map(
    eventTypes.map((eventType) => [eventType.id, eventType.name]),
  );
  const stats = summarize(bookings, now);

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 lg:p-6">
      <section className="grid grid-cols-2 gap-4 @xl/main:grid-cols-4">
        <StatCard title="Upcoming" value={stats.upcoming} />
        <StatCard title="Today" value={stats.today} />
        <StatCard title="Cancelled" value={stats.cancelled} />
        <StatCard title="Open slots (7 days)" value={slots.length} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            Upcoming appointments, {TIME_ZONE} time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    No bookings yet.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    eventTypeNames={eventTypeNames}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
