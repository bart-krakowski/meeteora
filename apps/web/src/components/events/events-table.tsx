"use client";

import { Badge } from "@meeteora/ui/components/badge";
import { Button } from "@meeteora/ui/components/button";
import { DataTable, dataTableColumns } from "@meeteora/ui/components/data-table";
import Link from "next/link";
import { formatEventDate, formatPrice } from "@/lib/events/format";
import type { PublicEvent, RegistrationStatus } from "@/lib/events/types";
import { CopyLinkButton } from "./copy-link-button";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  open: "Open",
  waitlist: "Waitlist",
  closed: "Closed",
};

const column = dataTableColumns<PublicEvent>();

const columns = column.columns([
  column.accessor("title", {
    header: "Event",
    sortFn: "text",
    meta: { className: "font-medium" },
  }),
  column.accessor("startsAt", {
    header: "Date",
    sortFn: "basic",
    cell: ({ row }) => formatEventDate(row.original),
  }),
  column.accessor((event) => event.price?.amount ?? 0, {
    id: "ticket",
    header: "Ticket",
    sortFn: "basic",
    cell: ({ row }) => formatPrice(row.original.price),
  }),
  column.accessor("attendeeCount", {
    header: "Guests",
    sortFn: "basic",
    meta: { className: "tabular-nums" },
    cell: ({ row: { original: event } }) =>
      event.capacity === null
        ? event.attendeeCount
        : `${event.attendeeCount} / ${event.capacity}`,
  }),
  column.accessor("status", {
    header: "Status",
    sortFn: "text",
    cell: ({ getValue }) => (
      <Badge variant="outline">{STATUS_LABEL[getValue()]}</Badge>
    ),
  }),
  column.display({
    id: "link",
    header: "Link",
    meta: { className: "text-right" },
    cell: ({ row: { original: event } }) => (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/e/${event.slug}`} target="_blank" />}
        >
          Open
        </Button>
        <CopyLinkButton path={`/e/${event.slug}`} />
      </div>
    ),
  }),
]);

/** Public events, soonest first, sortable by any column. */
export function EventsTable({ events }: { events: Array<PublicEvent> }) {
  return (
    <DataTable
      columns={columns}
      data={events}
      getRowId={(event) => event.slug}
      initialSorting={[{ id: "startsAt", desc: false }]}
      emptyMessage="No events yet."
    />
  );
}
