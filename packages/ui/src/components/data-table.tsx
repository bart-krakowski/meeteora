'use client';

import {
  type ColumnDef,
  createColumnHelper,
  createSortedRowModel,
  type RowData,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { cn } from 'cn';
import * as React from 'react';
import { ChevronDownIcon, ChevronsUpDownIcon, ChevronUpIcon } from './icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

export interface DataTableColumnMeta {
  className?: string;
}

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableColumn<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  unknown
>;

export function dataTableColumns<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

const SORT_LABEL = { asc: 'ascending', desc: 'descending' } as const;

function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  initialSorting = [],
  emptyMessage = 'No results.',
  className,
}: {
  columns: Array<DataTableColumn<TData>>;
  data: Array<TData>;
  getRowId?: (row: TData) => string;
  initialSorting?: SortingState;
  emptyMessage?: React.ReactNode;
  className?: string;
}) {
  const [sorting, setSorting] = React.useState(initialSorting);
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { sorting },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
  });
  const rows = table.getRowModel().rows;

  return (
    <div
      data-slot="data-table"
      className={cn(
        'overflow-hidden rounded-3xl bg-card text-card-foreground ring-1 ring-foreground/5 dark:ring-foreground/10',
        '[&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_th:first-child]:pl-5 [&_th:last-child]:pr-5',
        className,
      )}
    >
      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const { column } = header;
                const sorted = column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'h-10 text-muted-foreground',
                      column.columnDef.meta?.className,
                    )}
                    aria-sort={sorted ? SORT_LABEL[sorted] : undefined}
                  >
                    {header.isPlaceholder ? null : column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={column.getToggleSortingHandler()}
                        className="-mx-2 inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <table.FlexRender header={header} />
                        {sorted === 'asc' ? (
                          <ChevronUpIcon className="size-3.5" />
                        ) : sorted === 'desc' ? (
                          <ChevronDownIcon className="size-3.5" />
                        ) : (
                          <ChevronsUpDownIcon className="size-3.5 text-muted-foreground/60" />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={table.getAllLeafColumns().length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(cell.column.columnDef.meta?.className)}
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { DataTable };
