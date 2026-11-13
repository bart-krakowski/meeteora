"use client";

import type { Booking } from "@meeteora/contracts";
import { Badge } from "@meeteora/ui/components/badge";
import { Button } from "@meeteora/ui/components/button";
import { DataTable, dataTableColumns } from "@meeteora/ui/components/data-table";
import { useMemo } from "react";
import { cancelBookingAction } from "@/app/(dashboard)/actions";
import { formatDateTime } from "@/lib/format";

interface BookingRow {
  booking: Booking;
  service: string;
  /** Null when the resource has been deleted. */
  host: string | null;
  cancellable: boolean;
}

const column = dataTableColumns<BookingRow>();

const columns = column.columns([
  column.accessor((row) => row.booking.startAt, {
    id: "when",
    header: "When",
    sortFn: "basic",
    cell: ({ getValue }) => formatDateTime(getValue()),
  }),
  column.accessor((row) => row.booking.attendee.name, {
    id: "attendee",
    header: "Attendee",
    sortFn: "text",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.booking.attendee.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.booking.attendee.email}
        </span>
      </div>
    ),
  }),
  column.accessor("service", { header: "Service", sortFn: "text" }),
  column.accessor((row) => row.host ?? "", {
    id: "host",
    header: "Host",
    sortFn: "text",
    cell: ({ row }) =>
      row.original.host ?? <span className="text-muted-foreground">Removed</span>,
  }),
  column.accessor((row) => row.booking.status, {
    id: "status",
    header: "Status",
    sortFn: "text",
    cell: ({ getValue }) => (
      <Badge variant={getValue() === "confirmed" ? "default" : "secondary"}>
        {getValue()}
      </Badge>
    ),
  }),
  column.display({
    id: "actions",
    meta: { className: "text-right" },
    cell: ({ row }) =>
      row.original.cancellable && (
        <form action={cancelBookingAction}>
          <input type="hidden" name="id" value={row.original.booking.id} />
          <Button type="submit" variant="destructive" size="sm">
            Cancel
          </Button>
        </form>
      ),
  }),
]);

/**
 * Bookings as a sortable table: when, who, which service, host, status, and
 * Cancel for confirmed bookings that haven't started yet. Rows keep the
 * order they're given until a header is clicked.
 */
export function BookingsTable({
  bookings,
  eventTypeNames,
  resourceNames,
  now,
  emptyMessage = "No bookings yet.",
}: {
  bookings: Array<Booking>;
  eventTypeNames: ReadonlyMap<string, string>;
  /** Resource id to name; ids not in it belonged to deleted resources. */
  resourceNames: ReadonlyMap<string, string>;
  now: Date;
  emptyMessage?: string;
}) {
  const rows = useMemo(
    () =>
      bookings.map((booking) => ({
        booking,
        service: eventTypeNames.get(booking.ruleId) ?? booking.ruleId,
        host: resourceNames.get(booking.resourceId) ?? null,
        cancellable:
          booking.status === "confirmed" && new Date(booking.startAt) > now,
      })),
    [bookings, eventTypeNames, resourceNames, now],
  );

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.booking.id}
      emptyMessage={emptyMessage}
    />
  );
}
