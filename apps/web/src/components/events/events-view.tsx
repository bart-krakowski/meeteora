import { Badge } from "@meeteora/ui/components/badge";
import { Button } from "@meeteora/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@meeteora/ui/components/table";
import Link from "next/link";
import { connection } from "next/server";
import { formatEventDate, formatPrice } from "@/lib/events/format";
import type { RegistrationStatus } from "@/lib/events/types";
import { api } from "@/trpc/server";
import { CopyLinkButton } from "./copy-link-button";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  open: "Open",
  waitlist: "Waitlist",
  closed: "Closed",
};

/** The organizer's public events, each with its shareable invitation URL. */
export async function EventsView() {
  await connection();
  const events = await api.publicEvents.list();

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-semibold">Events</h1>
        <p className="text-sm text-muted-foreground">
          Share an event's link; guests register on its invitation page.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.slug}>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>{formatEventDate(event)}</TableCell>
              <TableCell>{formatPrice(event.price)}</TableCell>
              <TableCell className="tabular-nums">
                {event.attendeeCount}
                {event.capacity !== null && ` / ${event.capacity}`}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{STATUS_LABEL[event.status]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/e/${event.slug}`} target="_blank" />}
                  >
                    Open
                  </Button>
                  <CopyLinkButton path={`/e/${event.slug}`} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
