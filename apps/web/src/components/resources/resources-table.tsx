'use client';

import type { Resource } from '@meeteora/contracts';
import { Button } from '@meeteora/ui/components/button';
import {
  DataTable,
  dataTableColumns,
} from '@meeteora/ui/components/data-table';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTRPC } from '@/trpc/provider';
import { summarizeHours } from './hours-editor';
import {
  EditResourceDialog,
  useResourceMutationCallbacks,
} from './resource-dialogs';
import { ResourceHoursDialog } from './resource-hours-dialog';

export interface ResourceRow extends Resource {
  /** Confirmed bookings that haven't started yet. */
  upcoming: number;
  /** One-line summary of weekly hours and days off. */
  hours: string;
}

function ResourceActions({ resource }: { resource: ResourceRow }) {
  const trpc = useTRPC();
  const remove = useMutation(
    trpc.resources.delete.mutationOptions(useResourceMutationCallbacks()),
  );
  const busy = resource.upcoming > 0;
  return (
    <div className="flex justify-end gap-2">
      <ResourceHoursDialog resource={resource} />
      <EditResourceDialog resource={resource} />
      <Button
        variant="outline"
        size="sm"
        disabled={busy || remove.isPending}
        title={
          busy ? 'Cancel its upcoming bookings before deleting' : undefined
        }
        onClick={() => remove.mutate({ id: resource.id })}
      >
        Delete
      </Button>
    </div>
  );
}

const column = dataTableColumns<ResourceRow>();

const columns = column.columns([
  column.accessor('name', {
    header: 'Name',
    sortFn: 'text',
    meta: { className: 'font-medium' },
  }),
  column.accessor('capacity', {
    header: 'Capacity',
    sortFn: 'basic',
    meta: { className: 'tabular-nums' },
  }),
  column.accessor('hours', {
    header: 'Hours',
    meta: { className: 'text-muted-foreground tabular-nums' },
  }),
  column.accessor('upcoming', {
    header: 'Upcoming bookings',
    sortFn: 'basic',
    meta: { className: 'tabular-nums' },
  }),
  column.display({
    id: 'actions',
    meta: { className: 'text-right' },
    cell: ({ row }) => <ResourceActions resource={row.original} />,
  }),
]);

/** Hosts that bookings are held by, sorted by name. */
export function ResourcesTable({ upcomingFrom }: { upcomingFrom: string }) {
  const trpc = useTRPC();
  const { data: resourceList } = useSuspenseQuery(
    trpc.resources.list.queryOptions(),
  );
  const { data: bookings } = useSuspenseQuery(
    trpc.bookings.list.queryOptions({ from: upcomingFrom }),
  );

  const resources = useMemo<Array<ResourceRow>>(() => {
    const upcoming = new Map<string, number>();
    for (const booking of bookings) {
      if (booking.status !== 'confirmed') continue;
      upcoming.set(
        booking.resourceId,
        (upcoming.get(booking.resourceId) ?? 0) + 1,
      );
    }
    return resourceList.map((resource) => ({
      ...resource,
      hours: summarizeHours(resource),
      upcoming: upcoming.get(resource.id) ?? 0,
    }));
  }, [resourceList, bookings]);

  return (
    <DataTable
      columns={columns}
      data={resources}
      getRowId={(resource) => resource.id}
      initialSorting={[{ id: 'name', desc: false }]}
      emptyMessage="No resources yet. Add one to start offering times."
    />
  );
}
