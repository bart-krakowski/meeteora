"use client";

import type { Resource } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import {
  DataTable,
  type DataTableColumn,
  dataTableColumns,
} from "@meeteora/ui/components/data-table";
import { Input } from "@meeteora/ui/components/input";
import { toast } from "@meeteora/ui/components/sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useTRPC } from "@/trpc/provider";
import { formText } from "@/lib/form-data";

export interface ResourceRow extends Resource {
  /** Confirmed bookings that haven't started yet. */
  upcoming: number;
}

const column = dataTableColumns<ResourceRow>();

const errorMessage = (error: { message: string }) =>
  error.message || "Something went wrong. Try again.";

/** Hosts that bookings are held by: add, rename, and delete when free. */
export function ResourcesView({ resources }: { resources: Array<ResourceRow> }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);

  const onError = (error: { message: string }) => toast.error(errorMessage(error));
  const create = useMutation(
    trpc.resources.create.mutationOptions({ onSuccess: () => router.refresh(), onError }),
  );
  const rename = useMutation(
    trpc.resources.rename.mutationOptions({
      onSuccess: () => {
        setEditingId(null);
        router.refresh();
      },
      onError,
    }),
  );
  const remove = useMutation(
    trpc.resources.delete.mutationOptions({ onSuccess: () => router.refresh(), onError }),
  );

  const { mutate: renameResource, isPending: renaming } = rename;
  const { mutate: removeResource, isPending: removing } = remove;
  const columns = useMemo<Array<DataTableColumn<ResourceRow>>>(
    () =>
      column.columns([
        column.accessor("name", {
          header: "Name",
          sortFn: "text",
          cell: ({ row: { original: resource } }) =>
            editingId === resource.id ? (
              <form
                className="flex max-w-sm gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = formText(new FormData(event.currentTarget), "name");
                  renameResource({ id: resource.id, name });
                }}
              >
                <Input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={resource.name}
                  aria-label={`New name for ${resource.name}`}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <Button type="submit" size="sm" disabled={renaming}>
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              resource.name
            ),
        }),
        column.accessor("upcoming", {
          header: "Upcoming bookings",
          sortFn: "basic",
          meta: { className: "tabular-nums" },
        }),
        column.display({
          id: "actions",
          cell: ({ row: { original: resource } }) => (
            <div className="flex justify-end gap-2">
              {editingId !== resource.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingId(resource.id)}
                >
                  Rename
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                disabled={resource.upcoming > 0 || removing}
                title={
                  resource.upcoming > 0
                    ? "Cancel its upcoming bookings before deleting"
                    : undefined
                }
                onClick={() => removeResource({ id: resource.id })}
              >
                Delete
              </Button>
            </div>
          ),
        }),
      ]),
    [editingId, renameResource, renaming, removeResource, removing],
  );

  return (
    <>
      <PageHeader
        title="Resources"
        description="Hosts that bookings are held by. Each is offered Monday to Friday, 9:00 to 17:00, for every event type."
        actions={
          <form
            className="flex w-full gap-2 sm:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const name = formText(new FormData(form), "name");
              create.mutate({ name }, { onSuccess: () => form.reset() });
            }}
          >
            <Input
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Anna or Room 2"
              aria-label="Resource name"
              className="sm:w-56"
            />
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add resource"}
            </Button>
          </form>
        }
      />
        <DataTable
          columns={columns}
          data={resources}
          getRowId={(resource) => resource.id}
          initialSorting={[{ id: "name", desc: false }]}
          emptyMessage="No resources yet. Add one to start offering times."
        />
    </>
  );
}
