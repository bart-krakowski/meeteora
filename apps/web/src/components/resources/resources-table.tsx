"use client";

import type { Resource } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import { DataTable, dataTableColumns } from "@meeteora/ui/components/data-table";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/provider";
import { RenameResourceDialog, useResourceMutationCallbacks } from "./resource-dialogs";

export interface ResourceRow extends Resource {
  /** Confirmed bookings that haven't started yet. */
  upcoming: number;
}

function ResourceActions({ resource }: { resource: ResourceRow }) {
  const trpc = useTRPC();
  const remove = useMutation(
    trpc.resources.delete.mutationOptions(useResourceMutationCallbacks()),
  );
  const busy = resource.upcoming > 0;
  return (
    <div className="flex justify-end gap-2">
      <RenameResourceDialog resource={resource} />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || remove.isPending}
        title={busy ? "Cancel its upcoming bookings before deleting" : undefined}
        onClick={() => remove.mutate({ id: resource.id })}
      >
        Delete
      </Button>
    </div>
  );
}

const column = dataTableColumns<ResourceRow>();

const columns = column.columns([
  column.accessor("name", {
    header: "Name",
    sortFn: "text",
    meta: { className: "font-medium" },
  }),
  column.accessor("upcoming", {
    header: "Upcoming bookings",
    sortFn: "basic",
    meta: { className: "tabular-nums" },
  }),
  column.display({
    id: "actions",
    meta: { className: "text-right" },
    cell: ({ row }) => <ResourceActions resource={row.original} />,
  }),
]);

/** Hosts that bookings are held by, sorted by name. */
export function ResourcesTable({ resources }: { resources: Array<ResourceRow> }) {
  return (
    <DataTable
      columns={columns}
      data={resources}
      getRowId={(resource) => resource.id}
      initialSorting={[{ id: "name", desc: false }]}
      emptyMessage="No resources yet. Add one to start offering times."
    />
  );
}
