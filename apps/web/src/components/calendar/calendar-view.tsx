"use client";

import {
  calculateGhostPreviewStyle,
  calculateSegmentResizePreview,
  formatEventTimeRange,
  useCalendar,
} from "@tanstack/react-time";
import {
  calendarFeatures,
  dayEventLayoutFeature,
  eventFilterFeature,
  eventMoveFeature,
  eventRecurrenceFeature,
  eventResizeFeature,
  historyFeature,
  resourceAvailabilityFeature,
  workingTimeFeature,
} from "@tanstack/time";
import {
  DragDropProvider,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { Feedback } from "@dnd-kit/dom";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { useInfiniteScroll } from "@/lib/useInfiniteScroll";
import type {
  DateParts,
  Day,
  Event,
  EventDateTimeInput,
  LayoutStrategyFn,
  MoveGranularity,
  OverlapStrategy,
  RecurrenceEditScope,
  RecurrenceFrequency,
  RecurrenceRule,
  ResizeError,
  Resource,
  WorkingCalendar,
} from "@tanstack/time";
import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/react";
import { Button } from "@meeteora/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@meeteora/ui/components/dialog";
import { Input } from "@meeteora/ui/components/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@meeteora/ui/components/field";
import { Badge } from "@meeteora/ui/components/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@meeteora/ui/components/context-menu";
import { ScrollArea } from "@meeteora/ui/components/scroll-area";
import { TIME_ZONE } from "@/lib/format";

const features = calendarFeatures([
  historyFeature,
  workingTimeFeature,
  resourceAvailabilityFeature,
  eventRecurrenceFeature,
  eventResizeFeature,
  eventMoveFeature,
  eventFilterFeature,
  dayEventLayoutFeature,
]);

function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDaySpan(start: string, end: string): number {
  const msPerDay = 86_400_000;
  const diff =
    Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(diff / msPerDay) + 1;
}

function clampIsoRange(
  range: { start: string; end: string },
  maxDays: number,
  keep: "start" | "end",
): { start: string; end: string } {
  if (isoDaySpan(range.start, range.end) <= maxDays) return range;
  return keep === "end"
    ? { start: shiftIsoDate(range.end, -(maxDays - 1)), end: range.end }
    : { start: range.start, end: shiftIsoDate(range.start, maxDays - 1) };
}

interface ScrollAnchor {
  isoDate: string;
  offset: number;
}

function captureScrollAnchor(
  container: HTMLElement | null,
  axis: "x" | "y",
): ScrollAnchor | null {
  if (!container) return null;
  const bounds = container.getBoundingClientRect();
  const edge = axis === "y" ? bounds.top : bounds.left;
  const cells = container.querySelectorAll<HTMLElement>("[data-day-date]");
  for (const cell of cells) {
    const rect = cell.getBoundingClientRect();
    if ((axis === "y" ? rect.bottom : rect.right) <= edge) continue;
    const isoDate = cell.dataset.dayDate;
    if (!isoDate) continue;
    return { isoDate, offset: (axis === "y" ? rect.top : rect.left) - edge };
  }
  return null;
}

function restoreScrollAnchor(
  container: HTMLElement,
  axis: "x" | "y",
  anchor: ScrollAnchor,
): boolean {
  const cell = container.querySelector<HTMLElement>(
    `[data-day-date="${anchor.isoDate}"]`,
  );
  if (!cell) return false;
  const bounds = container.getBoundingClientRect();
  const rect = cell.getBoundingClientRect();
  const delta =
    axis === "y"
      ? rect.top - bounds.top - anchor.offset
      : rect.left - bounds.left - anchor.offset;
  if (Math.abs(delta) < 0.5) return false;
  if (axis === "y") container.scrollTop += delta;
  else container.scrollLeft += delta;
  return true;
}

function getResourceId(resource: Resource | string): string {
  return typeof resource === "string" ? resource : resource.id;
}

type EventDragData = {
  event: DemoEvent;
  dayDate: string;
  granularity: MoveGranularity;
  originalStart: string;
  originalEnd: string;
  occurrenceStart?: EventDateTimeInput;
};

type DayDropData = { isoDate: string };

const isRecord = (data: unknown): data is Record<string, unknown> =>
  typeof data === "object" && data !== null;

const isEventDragData = (data: unknown): data is EventDragData =>
  isRecord(data) && "event" in data && typeof data.originalStart === "string";

const isDayDropData = (data: unknown): data is DayDropData =>
  isRecord(data) && typeof data.isoDate === "string";

function dropDay(data: unknown): string | undefined {
  return isDayDropData(data) ? data.isoDate : undefined;
}

function eventDragSource(data: unknown): EventDragData | undefined {
  return isEventDragData(data) ? data : undefined;
}

type DragTimePreview = { eventId: string; start: string; end: string };

const DRAG_GROUP_ATTRIBUTE = "data-drag-group";

function dragGroupSiblings(eventId: string): Array<HTMLElement> {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${DRAG_GROUP_ATTRIBUTE}="${eventId}"]:not([data-dnd-dragging]):not([data-dnd-placeholder])`,
    ),
  );
}

const eventDragSensors = [
  PointerSensor.configure({
    preventActivation: (event) =>
      event.target instanceof Element &&
      event.target.closest("[data-resize-handle]") !== null,
  }),
];

function EventDragSource({
  id,
  data,
  disabled,
  children,
}: {
  id: string;
  data: EventDragData;
  disabled?: boolean;
  children: (drag: {
    ref: (element: Element | null) => void;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { ref, isDragging } = useDraggable<EventDragData>({
    id,
    data,
    disabled,
    sensors: eventDragSensors,
  });

  return <>{children({ ref, isDragging })}</>;
}

function DayDropZone({
  isoDate,
  className,
  columnRef,
  children,
  ...rest
}: React.ComponentProps<"div"> & {
  isoDate: string;
  columnRef?: (element: HTMLElement | null) => void;
}) {
  const { ref: setDroppableRef, isDropTarget } = useDroppable<DayDropData>({
    id: `day-${isoDate}`,
    data: { isoDate },
  });

  return (
    <div
      ref={(element) => {
        setDroppableRef(element);
        columnRef?.(element);
      }}
      className={`${className ?? ""} ${isDropTarget ? "ring-1 ring-inset ring-neutral-500" : ""}`}
      {...rest}
    >
      {children}
    </div>
  );
}

const MAX_BUFFERED_WEEKS = 16;
const MAX_BUFFERED_SCHEDULE_PERIODS = 5;

const LEAD_SHARE = 0.6;

const focusStrategy: LayoutStrategyFn = (info) => {
  if (info.concurrency === 1) return { crossStart: 0, crossSize: 1 };
  if (info.depth === 0) {
    return { crossStart: 0, crossSize: LEAD_SHARE, zIndex: 0 };
  }

  const slice = (1 - LEAD_SHARE) / (info.concurrency - 1);
  return {
    crossStart: LEAD_SHARE + (info.depth - 1) * slice,
    crossSize: slice,
    zIndex: info.depth,
  };
};

const overlapModes = {
  columns: "columns",
  expand: "expand",
  cascade: "cascade",
  focus: focusStrategy,
} satisfies Record<string, OverlapStrategy | LayoutStrategyFn>;

type OverlapMode = keyof typeof overlapModes;

const OVERLAP_MODE_ORDER: ReadonlyArray<OverlapMode> = [
  "columns",
  "expand",
  "cascade",
  "focus",
];

const overlapModeLabels: Record<OverlapMode, string> = {
  columns: "Side by side",
  expand: "Expand",
  cascade: "Cascade",
  focus: "Focus first",
};

type DemoCalendar = ReturnType<
  typeof useCalendar<typeof features, Resource, DemoEvent>
>;

function weekAlignedRange(
  calendar: Pick<DemoCalendar, "getDaysInRange" | "groupDaysBy">,
  range: { start: string; end: string },
): { start: string; end: string } {
  const weeks = calendar.groupDaysBy({
    days: calendar.getDaysInRange(range.start, range.end),
    unit: "week",
    fillMissingDays: true,
  });
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];
  return {
    start: firstWeek?.[0]?.isoDate ?? range.start,
    end: lastWeek?.[lastWeek.length - 1]?.isoDate ?? range.end,
  };
}

const overlayCalendars = [];

function OverlayDayParts({
  calendar,
  isoDate,
  calendarIds,
}: {
  calendar: DemoCalendar;
  isoDate: string;
  calendarIds: Array<string>;
}) {
  return overlayCalendars
    .filter((system) => calendarIds.includes(system.id))
    .map((system) => (
      <span
        key={system.id}
        className="block text-xs font-normal text-neutral-500/80"
      >
        {system.render(
          calendar.getDateParts(isoDate, {
            calendar: system.id,
            locale: system.locale,
          }),
        )}
      </span>
    ));
}

const workingCalendars: Array<WorkingCalendar> = [
  {
    id: "office",
    label: "Office week",
    intervals: [
      {
        isWorking: true,
        recurrent: {
          weekdays: [1, 2, 3, 4, 5],
          startTime: "00:00",
          endTime: "24:00",
        },
      },
    ],
  },
];

export interface CalendarResource {
  id: string;
  name: string;
}

export interface CalendarBooking {
  id: string;
  resourceId: string;
  startAt: string;
  endAt: string;
  status: string;
  title: string;
}

function toResource({ id, name }: CalendarResource): Resource {
  return { id, label: name, capacity: [1] };
}

const wallClockFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Instant -> naive wall-clock string in TIME_ZONE; calendar runs on naive times. */
function toWallClock(iso: string): string {
  const parts = Object.fromEntries(
    wallClockFormat
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

function toCalendarEvent(
  booking: CalendarBooking,
  resourceById: ReadonlyMap<string, Resource>,
): DemoEvent {
  const resource = resourceById.get(booking.resourceId);
  return {
    id: booking.id,
    title: booking.title,
    start: toWallClock(booking.startAt),
    end: toWallClock(booking.endAt),
    resources: resource ? [resource] : [],
    consumption: [1],
    categoryId: booking.status === "confirmed" ? "confirmed" : "cancelled",
  };
}

interface EventCategory {
  id: string;
  label: string;
  swatch: string;
  eventClass: string;
}

const eventCategories: Array<EventCategory> = [
  {
    id: "confirmed",
    label: "Confirmed",
    swatch: "#a3a3a3",
    eventClass:
      "bg-neutral-800/80 border-neutral-600/60 hover:bg-neutral-700/90",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    swatch: "#525252",
    eventClass:
      "bg-neutral-900/60 border-neutral-800/60 text-neutral-500 line-through hover:bg-neutral-900/80",
  },
];

const categoryById = new Map(
  eventCategories.map((category) => [category.id, category]),
);

const FALLBACK_EVENT_CLASS =
  "bg-neutral-800 border-neutral-700 hover:bg-neutral-700";

function eventClassOf(event: DemoEvent): string {
  return categoryById.get(event.categoryId)?.eventClass ?? FALLBACK_EVENT_CLASS;
}

interface DemoEvent extends Event {
  categoryId: string;
}

interface EventFormData {
  title: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  categoryId: string;
  resourceId: string;
  consumption: number;
  recurrenceFrequency: RecurrenceFrequency | "none";
  recurrenceUntil: string;
  recurrenceEditScope: RecurrenceEditScope;
  allDay: boolean;
}

const emptyFormData: EventFormData = {
  title: "",
  startDate: formatDateToISO(new Date()),
  startTime: "09:00",
  endDate: formatDateToISO(new Date()),
  endTime: "10:00",
  categoryId: eventCategories[0]?.id ?? "",
  resourceId: "",
  consumption: 1,
  recurrenceFrequency: "none",
  recurrenceUntil: "",
  recurrenceEditScope: "this",
  allDay: false,
};

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  startDate: z.string().min(1, "Start date is required."),
  startTime: z.string(),
  endDate: z.string().min(1, "End date is required."),
  endTime: z.string(),
  categoryId: z.string().min(1, "Pick a calendar."),
  resourceId: z.string().min(1, "Pick a resource."),
  consumption: z.number().min(1, "Consumption must be at least 1."),
  recurrenceFrequency: z.custom<RecurrenceFrequency | "none">(),
  recurrenceUntil: z.string(),
  recurrenceEditScope: z.custom<RecurrenceEditScope>(),
  allDay: z.boolean(),
});

function EventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  isRecurring,
  mode,
  isSaving,
  resources,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => Promise<void>;
  onDelete?: (data: EventFormData) => void;
  initialData: EventFormData;
  mode: "add" | "edit";
  isRecurring?: boolean;
  isSaving?: boolean;
  resources: Array<Resource>;
}) {
  const form = useForm({
    formId: "event-modal",
    defaultValues: initialData,
    validators: { onSubmit: eventFormSchema },
    onSubmit: async () => {
      try {
        await onSave(form.state.values);
        onClose();
      } catch {
        return;
      }
    },
  });

  useEffect(() => {
    form.reset(initialData);
  }, [initialData]);

  const recurrencyOptions: Array<{
    value: RecurrenceFrequency | "none";
    label: string;
  }> = [
    { value: "none", label: "Does not repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const recurrenceEditScopeOptions: Array<{
    value: RecurrenceEditScope;
    label: string;
  }> = [
    { value: "this", label: "This event only" },
    { value: "thisAndFollowing", label: "This and following events" },
    { value: "all", label: "All events in series" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Event" : "Edit Event"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
          className="mt-4"
        >
          <FieldGroup className="gap-4">
            <form.Field
              name="title"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="gap-2">
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                      id="title"
                      type="text"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Event title"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="allDay"
              children={(field) => (
                <Field orientation="horizontal" className="gap-2">
                  <input
                    id="allDay"
                    type="checkbox"
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <FieldLabel htmlFor="allDay" className="cursor-pointer">
                    All-day
                  </FieldLabel>
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="startDate"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor="startDate">Start Date</FieldLabel>
                      <Input
                        id="startDate"
                        type="date"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Subscribe
                selector={(s) => s.values.allDay}
                children={(allDay) => (
                  <form.Field
                    name="startTime"
                    children={(field) => (
                      <Field className="gap-2">
                        <FieldLabel htmlFor="startTime">Start Time</FieldLabel>
                        <Input
                          id="startTime"
                          type="time"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={allDay}
                          required={!allDay}
                        />
                      </Field>
                    )}
                  />
                )}
              />
            </div>

            <form.Field
              name="categoryId"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="gap-2">
                    <FieldLabel htmlFor="categoryId">Calendar</FieldLabel>
                    <select
                      id="categoryId"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    >
                      {eventCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="resourceId"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor="resourceId">Resource</FieldLabel>
                      <select
                        id="resourceId"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      >
                        {resources.map((resource) => (
                          <option key={resource.id} value={resource.id}>
                            {resource.label}
                          </option>
                        ))}
                      </select>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="consumption"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor="consumption">Consumption</FieldLabel>
                      <Input
                        id="consumption"
                        type="number"
                        min={1}
                        step={1}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            Math.max(1, Number(e.target.value) || 1),
                          )
                        }
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="endDate"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor="endDate">End Date</FieldLabel>
                      <Input
                        id="endDate"
                        type="date"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Subscribe
                selector={(s) => s.values.allDay}
                children={(allDay) => (
                  <form.Field
                    name="endTime"
                    children={(field) => (
                      <Field className="gap-2">
                        <FieldLabel htmlFor="endTime">End Time</FieldLabel>
                        <Input
                          id="endTime"
                          type="time"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={allDay}
                          required={!allDay}
                        />
                      </Field>
                    )}
                  />
                )}
              />
            </div>

            {mode === "edit" && isRecurring && (
              <form.Field
                name="recurrenceEditScope"
                children={(field) => (
                  <Field className="gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
                    <FieldLabel htmlFor="recurrenceEditScope">
                      Apply changes to
                    </FieldLabel>
                    <select
                      id="recurrenceEditScope"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const scope = recurrenceEditScopeOptions.find(
                          (opt) => opt.value === e.target.value,
                        );
                        if (scope) field.handleChange(scope.value);
                      }}
                    >
                      {recurrenceEditScopeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-neutral-500">
                      Save or Delete uses selected recurring-event scope.
                    </p>
                  </Field>
                )}
              />
            )}

            <form.Field
              name="recurrenceFrequency"
              children={(field) => (
                <Field className="gap-2">
                  <FieldLabel htmlFor="recurrenceFrequency">Repeat</FieldLabel>
                  <select
                    id="recurrenceFrequency"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      const frequency = recurrencyOptions.find(
                        (opt) => opt.value === e.target.value,
                      );
                      if (frequency) field.handleChange(frequency.value);
                    }}
                  >
                    {recurrencyOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            />

            {form.state.values.recurrenceFrequency !== "none" && (
              <form.Field
                name="recurrenceUntil"
                children={(field) => (
                  <Field className="gap-2">
                    <FieldLabel htmlFor="recurrenceUntil">
                      Repeat until (optional)
                    </FieldLabel>
                    <Input
                      id="recurrenceUntil"
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  </Field>
                )}
              />
            )}

            <div className="flex justify-between pt-4">
              <div>
                {mode === "edit" && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      onDelete(form.store.state.values);
                      onClose();
                    }}
                  >
                    Delete
                    {isRecurring
                      ? ` ${
                          form.state.values.recurrenceEditScope === "this"
                            ? "this event"
                            : form.state.values.recurrenceEditScope ===
                                "thisAndFollowing"
                              ? "this and following"
                              : "series"
                        }`
                      : ""}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : mode === "add" ? "Add" : "Save"}
                </Button>
              </div>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ResizeHandleProps {
  edge: "top" | "bottom";
  onMouseDown: (e: React.MouseEvent) => void;
}

function ResizeHandle({ edge, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      data-resize-handle
      className={`absolute left-0 right-0 h-3 cursor-ns-resize z-30 bg-transparent hover:bg-neutral-500/30 pointer-events-auto ${
        edge === "top"
          ? "top-0 [@container_event_(height<24px)]:-top-3"
          : "bottom-0 [@container_event_(height<24px)]:-bottom-3"
      }`}
      onMouseDown={onMouseDown}
      onClick={(e) => {
        e.stopPropagation();
      }}
      style={{ touchAction: "none" }}
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-8 h-1 bg-neutral-400 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          edge === "top" ? "top-1" : "bottom-1"
        }`}
      />
    </div>
  );
}

function ScheduleView({
  calendar,
  days,
  resources,
  onEventClick,
  scrollRef,
  leftSentinelRef,
  rightSentinelRef,
  periodDayCount,
  overlapMode,
  dragPreview,
  overlayCalendarIds,
}: {
  calendar: DemoCalendar;
  days: Array<Day<Resource, DemoEvent>>;
  resources: Array<Resource>;
  onEventClick: (event: DemoEvent, scope?: RecurrenceEditScope) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  leftSentinelRef: React.RefObject<HTMLDivElement | null>;
  rightSentinelRef: React.RefObject<HTMLDivElement | null>;
  periodDayCount: number;
  overlapMode: OverlapMode;
  dragPreview: DragTimePreview | null;
  overlayCalendarIds: Array<string>;
}) {
  const timeSlots = calendar.getTimeSlots();
  const {
    resizeState,
    getResizeHandleProps,
    getDayColumnProps,
    getUnavailableRanges,
  } = calendar;

  const maxAllDay = days.reduce(
    (m, d) => Math.max(m, d.allDayEvents.length),
    0,
  );
  const allDayRowHeight = maxAllDay > 0 ? maxAllDay * 24 + 8 : 28;

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black">
      <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="flex gap-6 flex-wrap">
          {resources.map((resource, idx) => {
            const colors = ["#0049af75", "#00af3475"];
            const color = colors[idx % colors.length];
            return (
              <div key={resource.id} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-sm"
                  style={{
                    backgroundColor: color,
                    backgroundImage: `repeating-linear-gradient(315deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`,
                  }}
                />
                <span className="text-sm text-neutral-300">
                  {resource.label}
                </span>
                {resource.capacity !== undefined && (
                  <span className="text-xs text-neutral-500">
                    (Capacity: {resource.capacity})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex border-t border-neutral-800">
        <div className="w-20 border-r border-neutral-800 bg-neutral-950">
          <div className="h-12 border-b border-neutral-800"></div>
          <div
            className="border-b border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500 flex items-center"
            style={{ height: allDayRowHeight }}
          >
            all-day
          </div>
          {timeSlots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="h-15 border-b border-neutral-800/50 px-2 py-1 text-xs text-neutral-500"
            >
              {slot.label}
            </div>
          ))}
        </div>

        <ScrollArea viewportRef={scrollRef} className="flex-1">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `1px repeat(${days.length}, minmax(0, 1fr)) 1px`,
              minWidth: `${(days.length / periodDayCount) * 100}%`,
            }}
          >
            <div ref={leftSentinelRef} style={{ width: 1 }} aria-hidden />
            <div className="contents">
              {days.map((day) => {
                const dayDate = day.isoDate;
                const dayParts = calendar.getDateParts(dayDate);
                return (
                  <DayDropZone
                    key={day.isoDate}
                    isoDate={dayDate}
                    data-day-date={dayDate}
                    className="border-r border-neutral-800 last:border-r-0"
                    columnRef={getDayColumnProps(dayDate).ref}
                  >
                    <div className="h-12 border-b border-neutral-800 bg-neutral-950 px-3 py-1 text-center">
                      <div className="text-sm font-semibold text-neutral-200">
                        {dayParts.weekdayShort} - {dayParts.dayOfMonth}{" "}
                        {dayParts.monthShort}
                      </div>
                      <OverlayDayParts
                        calendar={calendar}
                        isoDate={dayDate}
                        calendarIds={overlayCalendarIds}
                      />
                    </div>
                    <div
                      className="border-b border-neutral-800 bg-neutral-950/60 px-1 py-1 flex flex-col gap-1 overflow-hidden"
                      style={{ height: allDayRowHeight }}
                    >
                      {day.allDayEvents.map((event) => {
                        const segment = calendar.getEventSegmentInfo(event);
                        return (
                          <EventDragSource
                            key={`ad-${event.id}`}
                            id={`all-day-${event.id}-${dayDate}`}
                            data={{
                              event,
                              dayDate,
                              granularity: "day",
                              originalStart: segment.originalStart,
                              originalEnd: segment.originalEnd,
                              occurrenceStart: event._occurrenceOriginalStart,
                            }}
                          >
                            {(drag) => (
                              <div
                                ref={drag.ref}
                                data-drag-group={event.id}
                                className={`group flex items-center gap-1 cursor-grab active:cursor-grabbing text-white rounded px-2 text-[11px] font-medium border ${eventClassOf(
                                  event,
                                )} ${drag.isDragging ? "shadow-xl ring-1 ring-neutral-400" : ""}`}
                                style={{ height: 20, lineHeight: "20px" }}
                                title={event.title}
                                onClick={() => onEventClick(event)}
                              >
                                <span className="truncate">{event.title}</span>
                              </div>
                            )}
                          </EventDragSource>
                        );
                      })}
                    </div>
                    <div className="relative h-360 bg-neutral-950/30">
                      {resources.map((resource, resourceIdx) => {
                        const resourceRanges = getUnavailableRanges(dayDate, {
                          resourceIds: [resource.id],
                        });
                        const colors = ["#0049af75", "#00af3475"];
                        const color = colors[resourceIdx % colors.length];

                        return resourceRanges.map((range, rangeIdx) => (
                          <div
                            key={`${resource.id}-${rangeIdx}`}
                            className="absolute left-0 right-0 pointer-events-none z-0 bg-size-[10px_10px] bg-fixed"
                            style={{
                              top: range.top,
                              height: range.height,
                              backgroundImage: `repeating-linear-gradient(315deg, ${color} 0, ${color} 1px, transparent 0, transparent 50%)`,
                            }}
                            title={`Unavailable - ${resource.label}`}
                          />
                        ));
                      })}
                      {day.events.map((event, eventIndex) => {
                        const eventProps = calendar.getEventProps(event, {
                          strategy: overlapModes[overlapMode],
                        });
                        const { style, isSplitEvent, layout } = eventProps;
                        const concurrency = layout?.concurrency ?? 1;

                        const segmentInfo = calendar.getEventSegmentInfo(event);
                        const {
                          isFirstSegment,
                          isLastSegment,
                          originalStart,
                          originalEnd,
                        } = segmentInfo;

                        const isBeingResized =
                          resizeState.isResizing &&
                          resizeState.eventId === event.id;

                        const resizePreview =
                          isBeingResized &&
                          resizeState.previewStart &&
                          resizeState.previewEnd
                            ? calculateSegmentResizePreview({
                                dayDate,
                                originalStart,
                                originalEnd,
                                previewStart: resizeState.previewStart,
                                previewEnd: resizeState.previewEnd,
                              })
                            : null;

                        if (resizePreview?.shouldHide) {
                          return null;
                        }

                        const displayStyle = resizePreview?.previewStyle
                          ? { ...style, ...resizePreview.previewStyle }
                          : style;

                        const showTopHandle = !isSplitEvent || isFirstSegment;
                        const showBottomHandle = !isSplitEvent || isLastSegment;
                        const isActivelyResized =
                          isBeingResized &&
                          resizePreview?.previewStyle !== null;

                        const stackedStyle =
                          displayStyle?.zIndex === undefined
                            ? displayStyle
                            : {
                                ...displayStyle,
                                zIndex:
                                  (isActivelyResized ? 20 : 10) +
                                  displayStyle.zIndex,
                              };

                        const dragTimes =
                          dragPreview?.eventId === event.id
                            ? dragPreview
                            : null;

                        const timeRange = formatEventTimeRange(
                          dragTimes?.start ??
                            (isBeingResized && resizeState.previewStart
                              ? resizeState.previewStart
                              : originalStart),
                          dragTimes?.end ??
                            (isBeingResized && resizeState.previewEnd
                              ? resizeState.previewEnd
                              : originalEnd),
                        );

                        return (
                          <EventDragSource
                            key={`${event.id}-${eventIndex}`}
                            id={`event-${event.id}-${dayDate}`}
                            data={{
                              event,
                              dayDate,
                              granularity: "time",
                              originalStart,
                              originalEnd,
                              occurrenceStart: event._occurrenceOriginalStart,
                            }}
                            disabled={resizeState.isResizing}
                          >
                            {(drag) => (
                              <ContextMenu>
                                <ContextMenuTrigger
                                  ref={drag.ref}
                                  data-drag-group={event.id}
                                  className={`@container/event @container-size group absolute z-10 text-white rounded text-xs font-medium transition-colors border ${eventClassOf(
                                    event,
                                  )} ${
                                    isActivelyResized
                                      ? "ring-2 ring-neutral-500 z-20"
                                      : "cursor-grab active:cursor-grabbing"
                                  } ${drag.isDragging ? "shadow-xl ring-1 ring-neutral-400" : ""}`}
                                  style={stackedStyle}
                                  onClick={(e: React.MouseEvent) => {
                                    if (
                                      !resizeState.isResizing &&
                                      !(
                                        e.target instanceof Element &&
                                        e.target.closest("[data-resize-handle]")
                                      )
                                    ) {
                                      onEventClick(event);
                                    }
                                  }}
                                >
                                  {showTopHandle && (
                                    <ResizeHandle
                                      edge="top"
                                      {...getResizeHandleProps(
                                        event.id,
                                        "top",
                                        originalStart,
                                        originalEnd,
                                        {
                                          occurrenceStart:
                                            event._occurrenceOriginalStart,
                                        },
                                      )}
                                    />
                                  )}
                                  <div className="absolute inset-0 overflow-hidden rounded-[inherit] px-2 py-3 [@container_event_(24px<=height<40px)]:py-1 [@container_event_(height<24px)]:py-0">
                                    <div className="font-semibold flex items-center gap-1.5 leading-tight">
                                      <span className="flex items-center gap-1 min-w-0">
                                        {event.recurrence && (
                                          <span
                                            className="opacity-60 shrink-0"
                                            title="Recurring event"
                                          >
                                            ↻
                                          </span>
                                        )}
                                        <span className="truncate">
                                          {event.title}
                                        </span>
                                      </span>
                                      {event.consumption &&
                                        event.consumption.length > 0 && (
                                          <span
                                            className="text-[10px] leading-none rounded bg-black/40 px-1 py-0.5 font-semibold shrink-0"
                                            title="Consumption"
                                          >
                                            {event.consumption.reduce(
                                              (a, b) => a + b,
                                              0,
                                            )}
                                          </span>
                                        )}
                                      {concurrency > 1 && (
                                        <span
                                          className="text-[10px] leading-none rounded bg-neutral-500/20 text-neutral-200 px-1 py-0.5 font-semibold shrink-0"
                                          title={`Overlaps ${concurrency - 1} other event(s)`}
                                        >
                                          ⇄{concurrency}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className={`text-xs opacity-90 mt-0.5 leading-tight truncate ${
                                        dragTimes
                                          ? "block"
                                          : "hidden [@container_event_(height>=56px)]:block"
                                      }`}
                                    >
                                      {timeRange.rangeFormatted}
                                    </div>
                                  </div>
                                  {showBottomHandle && (
                                    <ResizeHandle
                                      edge="bottom"
                                      {...getResizeHandleProps(
                                        event.id,
                                        "bottom",
                                        originalStart,
                                        originalEnd,
                                        {
                                          occurrenceStart:
                                            event._occurrenceOriginalStart,
                                        },
                                      )}
                                    />
                                  )}
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                  <ContextMenuItem
                                    onClick={() => onEventClick(event)}
                                  >
                                    {event.recurrence
                                      ? "Edit this occurrence"
                                      : "Edit event"}
                                  </ContextMenuItem>
                                  {event.recurrence && (
                                    <>
                                      <ContextMenuItem
                                        onClick={() =>
                                          onEventClick(
                                            event,
                                            "thisAndFollowing",
                                          )
                                        }
                                      >
                                        Edit this and following
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onClick={() =>
                                          onEventClick(event, "all")
                                        }
                                      >
                                        Edit series
                                      </ContextMenuItem>
                                    </>
                                  )}
                                  {event.recurrence && (
                                    <>
                                      <ContextMenuSeparator />
                                      <ContextMenuItem
                                        onClick={() =>
                                          calendar.goToPreviousOccurrence(
                                            event.id,
                                            event.start,
                                          )
                                        }
                                      >
                                        ← Previous occurrence
                                      </ContextMenuItem>
                                      <ContextMenuItem
                                        onClick={() =>
                                          calendar.goToNextOccurrence(
                                            event.id,
                                            event.start,
                                          )
                                        }
                                      >
                                        Next occurrence →
                                      </ContextMenuItem>
                                    </>
                                  )}
                                </ContextMenuContent>
                              </ContextMenu>
                            )}
                          </EventDragSource>
                        );
                      })}
                      {resizeState.isResizing &&
                        resizeState.previewStart &&
                        resizeState.previewEnd &&
                        !day.events.some((e) => e.id === resizeState.eventId) &&
                        (() => {
                          const ghostStyle = calculateGhostPreviewStyle({
                            dayDate,
                            previewStart: resizeState.previewStart,
                            previewEnd: resizeState.previewEnd,
                          });

                          if (!ghostStyle) return null;

                          const timeRange = formatEventTimeRange(
                            resizeState.previewStart,
                            resizeState.previewEnd,
                          );

                          return (
                            <div
                              className="absolute bg-neutral-700/60 text-neutral-200 rounded px-2 py-1 text-xs font-medium overflow-hidden border border-neutral-600 border-dashed z-20"
                              style={{ ...ghostStyle }}
                            >
                              <div className="font-semibold pt-1 opacity-80">
                                {timeRange.rangeFormatted}
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                  </DayDropZone>
                );
              })}
            </div>
            <div ref={rightSentinelRef} style={{ width: 1 }} aria-hidden />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function ResizeErrorToast({
  error,
  title = "Cannot Resize Event",
  onDismiss,
}: {
  error: ResizeError;
  title?: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
      <div className="bg-neutral-950/90 border border-neutral-700/50 text-neutral-200 rounded-lg px-4 py-3 shadow-lg max-w-md">
        <div className="flex items-start gap-3">
          <div className="text-neutral-400 text-lg">⚠</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-neutral-100 mb-1">{title}</div>
            <div className="text-sm text-neutral-200/80 mb-2">
              {error.message}
            </div>
            {error.conflicts && error.conflicts.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-neutral-300/70 font-medium uppercase tracking-wide">
                  Conflicts:
                </div>
                {error.conflicts.map((conflict, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-neutral-200/70 bg-neutral-950/50 rounded px-2 py-1.5 border border-neutral-800/30"
                  >
                    <div className="font-medium text-neutral-200/90">
                      {conflict.date}
                    </div>
                    <div className="text-neutral-300/60">
                      {conflict.conflictRange.start} -{" "}
                      {conflict.conflictRange.end}
                    </div>
                    <div className="text-neutral-300/50 mt-0.5">
                      {conflict.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-neutral-300/60 mt-2">
              {error.eventTitle}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-destructive-foreground/60 hover:text-destructive-foreground h-6 w-6"
          >
            ✕
          </Button>
        </div>
      </div>
    </div>
  );
}

function ScopeChoiceModal({
  event,
  isOpen,
  title = "Edit recurring event",
  onSelect,
  onClose,
}: {
  event: Event | null;
  isOpen: boolean;
  title?: string;
  onSelect: (scope: RecurrenceEditScope) => void;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs bg-card border-border">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 text-sm text-neutral-400">
          {event?.title ?? "Choose how to apply this recurring-event change."}
        </div>
        <div className="space-y-2 mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("this")}
          >
            This occurrence
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("thisAndFollowing")}
          >
            This and following
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("all")}
          >
            All events
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface CalendarViewProps {
  resources: Array<CalendarResource>;
  bookings: Array<CalendarBooking>;
}

export function CalendarView({
  resources: initialResources,
  bookings,
}: CalendarViewProps) {
  const [resources, setResources] = useState<Array<Resource>>(() =>
    initialResources.map(toResource),
  );
  useEffect(() => {
    setResources(initialResources.map(toResource));
  }, [initialResources]);

  const events = useMemo(() => {
    const resourceById = new Map(
      initialResources.map((resource) => [resource.id, toResource(resource)]),
    );
    return bookings.map((booking) => toCalendarEvent(booking, resourceById));
  }, [bookings, initialResources]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    eventId?: string;
    occurrenceStart?: string;
    isRecurring?: boolean;
    initialData: EventFormData;
  }>({
    isOpen: false,
    mode: "add",
    initialData: emptyFormData,
  });

  const [scopeChoiceEvent, setScopeChoiceEvent] = useState<DemoEvent | null>(
    null,
  );
  const [resizeScopeChoice, setResizeScopeChoice] = useState<{
    eventId: string;
    occurrenceStart: EventDateTimeInput;
    newStart: string;
    newEnd: string;
  } | null>(null);

  const [resizeError, setResizeError] = useState<ResizeError | null>(null);
  const [moveError, setMoveError] = useState<ResizeError | null>(null);
  const [moveScopeChoice, setMoveScopeChoice] = useState<{
    eventId: string;
    occurrenceStart: EventDateTimeInput;
    newStart: string;
    newEnd: string;
  } | null>(null);
  const [overlapMode, setOverlapMode] = useState<OverlapMode>("columns");
  const [overlayCalendarIds] = useState<Array<string>>(["chinese"]);
  const [visibleCategoryIds, setVisibleCategoryIds] = useState(
    () => new Set(eventCategories.map((category) => category.id)),
  );

  const calendar = useCalendar<typeof features, Resource, DemoEvent>({
    features,
    viewMode: { value: 1, unit: "month" },
    events,
    resources,
    calendars: workingCalendars,
    defaultCalendarId: "office",
    timeZone: "UTC",
    locale: "en-US",
    resize: {
      enabled: true,
      containerHeight: 1440,
      constraints: {
        minDurationMinutes: 15,
        snapToMinutes: 15,
      },
      onResizeError: (error) => {
        setResizeError(error);
      },
      onRecurringResizeEnd: (resize) => {
        setResizeScopeChoice({
          eventId: resize.eventId,
          occurrenceStart: resize.occurrenceStart,
          newStart: resize.newStart,
          newEnd: resize.newEnd,
        });
      },
    },
    move: {
      enabled: true,
      containerHeight: 1440,
      constraints: { snapToMinutes: 15 },
      onMoveError: (error) => {
        setMoveError(error);
      },
      onRecurringMoveEnd: (move) => {
        setMoveScopeChoice({
          eventId: move.eventId,
          occurrenceStart: move.occurrenceStart,
          newStart: move.newStart,
          newEnd: move.newEnd,
        });
      },
    },
  });

  const dayNames = calendar.getDaysNames("short");

  const {
    setEventFilter,
    setEvents,
    setResources: setCalendarResources,
  } = calendar;

  useEffect(() => {
    setEvents(events);
  }, [setEvents, events]);

  useEffect(() => {
    setCalendarResources(resources);
  }, [setCalendarResources, resources]);

  useEffect(() => {
    const showsEveryCalendar =
      visibleCategoryIds.size === eventCategories.length;
    setEventFilter(
      "category",
      showsEveryCalendar
        ? null
        : (event) => visibleCategoryIds.has(event.categoryId),
    );
  }, [setEventFilter, visibleCategoryIds]);

  const toggleCategory = (categoryId: string) => {
    setVisibleCategoryIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(categoryId)) next.add(categoryId);
      return next;
    });
  };

  const isScheduleView =
    calendar.viewMode.unit === "week" || calendar.viewMode.unit === "day";
  const scheduleDays: Array<Day<Resource, DemoEvent>> = isScheduleView
    ? calendar.viewMode.unit === "day"
      ? calendar.days.filter((day) => {
          const currentDateStr = calendar.currentPeriod;
          return day.isoDate === currentDateStr;
        })
      : calendar.days
    : [];

  const monthScrollRef = useRef<HTMLDivElement>(null);
  const monthBufferRef = useRef<{ start: string; end: string } | null>(null);
  if (monthBufferRef.current === null && calendar.days.length > 0) {
    monthBufferRef.current = weekAlignedRange(calendar, {
      start: calendar.days[0].isoDate,
      end: calendar.days[calendar.days.length - 1].isoDate,
    });
  }

  const navDirectionRef = useRef<"none" | "forward" | "backward">("none");
  const prevPeriodRef = useRef(calendar.currentPeriod);
  const monthAnchorRef = useRef<ScrollAnchor | null>(null);
  const needsScrollResetRef = useRef(false);
  const [bufferVersion, setBufferVersion] = useState(0);

  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const scheduleBufferRef = useRef<{ start: string; end: string } | null>(null);
  const scheduleNavDirectionRef = useRef<"none" | "forward" | "backward">(
    "none",
  );
  const prevSchedulePeriodRef = useRef(calendar.currentPeriod);
  const scheduleAnchorRef = useRef<ScrollAnchor | null>(null);
  const needsScheduleScrollResetRef = useRef(false);
  const scheduleScrollRatioRef = useRef(0);
  const [scheduleBufferVersion, setScheduleBufferVersion] = useState(0);
  const prevViewModeUnitRef = useRef(calendar.viewMode.unit);

  const [visibleMonth, setVisibleMonth] = useState(() =>
    calendar.currentPeriod.slice(0, 7),
  );
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setVisibleMonth(calendar.currentPeriod.slice(0, 7));
  }, [calendar.currentPeriod]);

  useEffect(() => {
    const el = monthScrollRef.current;
    if (!el) return undefined;

    const compute = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = undefined;
        const viewportRect = el.getBoundingClientRect();
        const cells = el.querySelectorAll<HTMLElement>("[data-day-date]");
        const visibleHeightByMonth = new Map<string, number>();

        for (const cell of cells) {
          const iso = cell.getAttribute("data-day-date");
          if (!iso) continue;
          const cellRect = cell.getBoundingClientRect();
          const visibleHeight =
            Math.min(cellRect.bottom, viewportRect.bottom) -
            Math.max(cellRect.top, viewportRect.top);
          if (visibleHeight <= 0) continue;
          const month = iso.slice(0, 7);
          visibleHeightByMonth.set(
            month,
            (visibleHeightByMonth.get(month) ?? 0) + visibleHeight,
          );
        }

        let dominantMonth: string | null = null;
        let dominantHeight = 0;
        for (const [month, height] of visibleHeightByMonth) {
          if (height > dominantHeight) {
            dominantMonth = month;
            dominantHeight = height;
          }
        }
        if (!dominantMonth) return;

        setVisibleMonth(dominantMonth);
      });
    };

    el.addEventListener("scroll", compute, { passive: true });
    compute();
    return () => el.removeEventListener("scroll", compute);
  }, [bufferVersion]);

  useEffect(() => {
    if (isScheduleView) return;
    if (calendar.currentPeriod === prevPeriodRef.current) return;
    prevPeriodRef.current = calendar.currentPeriod;

    const direction = navDirectionRef.current;
    navDirectionRef.current = "none";

    if (calendar.days.length === 0) return;
    const newStart = calendar.days[0].isoDate;
    const newEnd = calendar.days[calendar.days.length - 1].isoDate;

    if (direction === "none" || !monthBufferRef.current) {
      monthBufferRef.current = weekAlignedRange(calendar, {
        start: newStart,
        end: newEnd,
      });
      needsScrollResetRef.current = true;
    } else {
      const previous = monthBufferRef.current;
      monthAnchorRef.current = captureScrollAnchor(monthScrollRef.current, "y");
      monthBufferRef.current = clampIsoRange(
        weekAlignedRange(calendar, {
          start: newStart < previous.start ? newStart : previous.start,
          end: newEnd > previous.end ? newEnd : previous.end,
        }),
        MAX_BUFFERED_WEEKS * 7,
        direction === "backward" ? "start" : "end",
      );
    }

    setBufferVersion((v) => v + 1);
  }, [
    calendar.currentPeriod,
    calendar.days,
    calendar.getDaysInRange,
    calendar.groupDaysBy,
    isScheduleView,
  ]);

  useLayoutEffect(() => {
    const el = monthScrollRef.current;
    if (!el) return;

    if (needsScrollResetRef.current) {
      needsScrollResetRef.current = false;
      monthAnchorRef.current = null;
      el.scrollTop = 0;
      markMonthScroll();
      return;
    }

    const anchor = monthAnchorRef.current;
    if (!anchor) return;
    monthAnchorRef.current = null;
    if (restoreScrollAnchor(el, "y", anchor)) markMonthScroll();
  });

  if (prevViewModeUnitRef.current !== calendar.viewMode.unit) {
    prevViewModeUnitRef.current = calendar.viewMode.unit;
    prevPeriodRef.current = calendar.currentPeriod;
    prevSchedulePeriodRef.current = calendar.currentPeriod;
    scheduleBufferRef.current = null;
    monthBufferRef.current =
      calendar.days.length > 0
        ? weekAlignedRange(calendar, {
            start: calendar.days[0].isoDate,
            end: calendar.days[calendar.days.length - 1].isoDate,
          })
        : null;
  }

  const bufferedWeekGroups = useMemo(() => {
    void bufferVersion;
    void calendar.days;
    if (!monthBufferRef.current) return [];
    const days = calendar.getDaysInRange(
      monthBufferRef.current.start,
      monthBufferRef.current.end,
    );
    return calendar.groupDaysBy({
      days,
      unit: "week",
      fillMissingDays: true,
    });
  }, [
    bufferVersion,
    calendar.days,
    calendar.getDaysInRange,
    calendar.groupDaysBy,
  ]);

  const {
    startSentinelRef: monthTopRef,
    endSentinelRef: monthBottomRef,
    markProgrammaticScroll: markMonthScroll,
  } = useInfiniteScroll({
    root: monthScrollRef,
    rootMargin: "120px 0px",
    cooldownMs: 1000,
    onReachStart: () => {
      const el = monthScrollRef.current;
      if (!el || el.scrollHeight <= el.clientHeight) return;
      if (!monthBufferRef.current || calendar.isPending) return;
      navDirectionRef.current = "backward";
      calendar.goToSpecificPeriod(
        shiftIsoDate(monthBufferRef.current.start, -1),
      );
    },
    onReachEnd: () => {
      const el = monthScrollRef.current;
      if (!el || el.clientHeight === 0) return;
      if (!monthBufferRef.current || calendar.isPending) return;
      navDirectionRef.current = "forward";
      calendar.goToSpecificPeriod(shiftIsoDate(monthBufferRef.current.end, 1));
    },
    disabled: isScheduleView,
  });

  if (
    isScheduleView &&
    scheduleBufferRef.current === null &&
    scheduleDays.length > 0
  ) {
    const periodDays = scheduleDays.length;
    scheduleBufferRef.current = {
      start: shiftIsoDate(scheduleDays[0].isoDate, -periodDays),
      end: shiftIsoDate(scheduleDays[periodDays - 1].isoDate, periodDays),
    };
    scheduleScrollRatioRef.current = 1 / 3;
    needsScheduleScrollResetRef.current = true;
  }

  useEffect(() => {
    if (!isScheduleView) return;
    if (calendar.currentPeriod === prevSchedulePeriodRef.current) return;
    prevSchedulePeriodRef.current = calendar.currentPeriod;

    let currentDays: typeof calendar.days;
    if (calendar.viewMode.unit === "day") {
      const currentDateStr = calendar.currentPeriod;
      currentDays = calendar.days.filter(
        (day) => day.isoDate === currentDateStr,
      );
    } else {
      currentDays = calendar.days;
    }

    if (currentDays.length === 0) return;
    const newStart = currentDays[0].isoDate;
    const newEnd = currentDays[currentDays.length - 1].isoDate;

    const direction = scheduleNavDirectionRef.current;
    scheduleNavDirectionRef.current = "none";
    const periodDays = currentDays.length;

    if (direction === "none" || !scheduleBufferRef.current) {
      scheduleBufferRef.current = {
        start: shiftIsoDate(newStart, -periodDays),
        end: shiftIsoDate(newEnd, periodDays),
      };
      scheduleScrollRatioRef.current = 1 / 3;
      needsScheduleScrollResetRef.current = true;
    } else {
      const previous = scheduleBufferRef.current;
      scheduleAnchorRef.current = captureScrollAnchor(
        scheduleScrollRef.current,
        "x",
      );
      scheduleBufferRef.current = clampIsoRange(
        {
          start: newStart < previous.start ? newStart : previous.start,
          end: newEnd > previous.end ? newEnd : previous.end,
        },
        periodDays * MAX_BUFFERED_SCHEDULE_PERIODS,
        direction === "backward" ? "start" : "end",
      );
    }

    setScheduleBufferVersion((v) => v + 1);
  }, [
    calendar.currentPeriod,
    isScheduleView,
    calendar.viewMode.unit,
    calendar.days,
  ]);

  useLayoutEffect(() => {
    const el = scheduleScrollRef.current;
    if (!el) return;

    if (needsScheduleScrollResetRef.current) {
      needsScheduleScrollResetRef.current = false;
      scheduleAnchorRef.current = null;
      el.scrollLeft = el.scrollWidth * scheduleScrollRatioRef.current;
      markScheduleScroll();
      return;
    }

    const anchor = scheduleAnchorRef.current;
    if (!anchor) return;
    scheduleAnchorRef.current = null;
    if (restoreScrollAnchor(el, "x", anchor)) markScheduleScroll();
  });

  const bufferedScheduleDays = useMemo(() => {
    void scheduleBufferVersion;
    void calendar.days;
    if (!scheduleBufferRef.current) return scheduleDays;
    return calendar.getDaysInRange(
      scheduleBufferRef.current.start,
      scheduleBufferRef.current.end,
    );
  }, [
    scheduleBufferVersion,
    scheduleDays,
    calendar.days,
    calendar.getDaysInRange,
  ]);

  const { fetchEventsForRange } = calendar;

  useEffect(() => {
    const buffered = isScheduleView
      ? scheduleBufferRef.current
      : monthBufferRef.current;
    if (!buffered) return;
    void fetchEventsForRange(buffered.start, shiftIsoDate(buffered.end, 1));
  }, [
    fetchEventsForRange,
    isScheduleView,
    bufferVersion,
    scheduleBufferVersion,
  ]);

  const periodDayCount =
    calendar.viewMode.unit === "day" ? 1 : scheduleDays.length || 7;

  const {
    startSentinelRef: scheduleLeftRef,
    endSentinelRef: scheduleRightRef,
    markProgrammaticScroll: markScheduleScroll,
  } = useInfiniteScroll({
    root: scheduleScrollRef,
    rootMargin: "0px 50%",
    cooldownMs: 300,
    onReachStart: () => {
      const el = scheduleScrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      if (!scheduleBufferRef.current || calendar.isPending) return;
      scheduleNavDirectionRef.current = "backward";
      calendar.goToSpecificPeriod(
        shiftIsoDate(scheduleBufferRef.current.start, -1),
      );
    },
    onReachEnd: () => {
      const el = scheduleScrollRef.current;
      if (!el || el.clientWidth === 0) return;
      if (!scheduleBufferRef.current || calendar.isPending) return;
      scheduleNavDirectionRef.current = "forward";
      calendar.goToSpecificPeriod(
        shiftIsoDate(scheduleBufferRef.current.end, 1),
      );
    },
    disabled: !isScheduleView,
  });

  const goToPreviousPeriod = () => {
    navDirectionRef.current = "none";
    scheduleNavDirectionRef.current = "none";
    calendar.goToPreviousPeriod();
  };

  const goToNextPeriod = () => {
    navDirectionRef.current = "none";
    scheduleNavDirectionRef.current = "none";
    calendar.goToNextPeriod();
  };

  const goToToday = () => {
    navDirectionRef.current = "none";
    scheduleNavDirectionRef.current = "none";
    calendar.goToCurrentPeriod();

    monthBufferRef.current = null;
    scheduleBufferRef.current = null;
    needsScrollResetRef.current = true;
    needsScheduleScrollResetRef.current = true;
    setBufferVersion((v) => v + 1);
    setScheduleBufferVersion((v) => v + 1);
  };

  const openAddModal = () => {
    setModalState({
      isOpen: true,
      mode: "add",
      initialData: {
        ...emptyFormData,
        resourceId: resources[0]?.id ?? "",
      },
    });
  };

  const handleEventClick = (event: DemoEvent, scope?: RecurrenceEditScope) => {
    if (event.recurrence && !scope) {
      setScopeChoiceEvent(event);
      return;
    }
    openEditModal(event, scope);
  };

  const openEditModal = (
    event: DemoEvent,
    scope: RecurrenceEditScope = event.recurrence ? "this" : "all",
  ) => {
    const masterEvent = calendar.getMasterEvent(event);
    const segmentInfo = calendar.getEventSegmentInfo(event);
    const startDate = new Date(segmentInfo.originalStart);
    const endDate = new Date(segmentInfo.originalEnd);
    const rule = masterEvent.recurrence;
    const isRecurring = !!rule;
    const eventResource = event.resources?.[0] ?? masterEvent.resources?.[0];
    const eventResourceId = eventResource ? getResourceId(eventResource) : "";

    setModalState({
      isOpen: true,
      mode: "edit",
      eventId: isRecurring ? event.id : masterEvent.id,
      occurrenceStart: isRecurring
        ? (event._occurrenceOriginalStart ?? segmentInfo.originalStart)
        : undefined,
      isRecurring,
      initialData: {
        title: event.title,
        startDate: formatDateToISO(startDate),
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: formatDateToISO(endDate),
        endTime: endDate.toTimeString().slice(0, 5),
        categoryId:
          event.categoryId ||
          masterEvent.categoryId ||
          eventCategories[0]?.id ||
          "",
        resourceId: eventResourceId || resources[0]?.id || "",
        consumption:
          event.consumption?.[0] ?? masterEvent.consumption?.[0] ?? 1,
        recurrenceFrequency: rule?.frequency ?? "none",
        recurrenceUntil: rule?.until ?? "",
        recurrenceEditScope: scope,
        allDay: !!event.allDay,
      },
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: EventFormData) => {
    setIsSaving(true);
    try {
      const recurrence: RecurrenceRule | undefined =
        data.recurrenceFrequency !== "none"
          ? {
              frequency: data.recurrenceFrequency,
              ...(data.recurrenceUntil ? { until: data.recurrenceUntil } : {}),
            }
          : undefined;

      const start = data.allDay
        ? `${data.startDate}T00:00:00`
        : `${data.startDate}T${data.startTime}:00`;
      const end = data.allDay
        ? `${data.endDate}T23:59:59`
        : `${data.endDate}T${data.endTime}:00`;
      const selectedResource = resources.find((r) => r.id === data.resourceId);
      const eventResources =
        data.allDay || !selectedResource ? [] : [selectedResource];
      const eventConsumption = data.allDay ? [] : [data.consumption];

      const updates: Partial<Omit<DemoEvent, "id">> = {
        title: data.title,
        start,
        end,
        categoryId: data.categoryId,
        ...(modalState.isRecurring && data.recurrenceEditScope === "this"
          ? {}
          : { recurrence }),
        resources: eventResources,
        consumption: eventConsumption,
        allDay: data.allDay,
      };

      const result =
        modalState.mode === "edit" && modalState.eventId
          ? modalState.isRecurring
            ? await calendar.editRecurringEvent(modalState.eventId, updates, {
                scope: data.recurrenceEditScope,
                occurrenceStart: modalState.occurrenceStart,
              })
            : await calendar.editEvent(modalState.eventId, updates)
          : await calendar.addEvent({
              id: String(Date.now()),
              title: data.title,
              start,
              end,
              categoryId: data.categoryId,
              recurrence,
              resources: eventResources,
              consumption: eventConsumption,
              allDay: data.allDay,
            });
      if (!result.success) {
        setResizeError(result.error);
        throw new Error("Validation failed");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const hiddenEventCount = calendar.getHiddenEvents().length;
  const loadedEventCount = calendar.getEvents().length;

  const handleDelete = (data: EventFormData) => {
    if (!modalState.eventId) return;

    if (modalState.isRecurring) {
      calendar.removeRecurringEvent(modalState.eventId, {
        scope: data.recurrenceEditScope,
        occurrenceStart: modalState.occurrenceStart,
      });
      return;
    }

    calendar.removeEvent(modalState.eventId);
  };

  const moveState = calendar.moveState;
  const dragPreview: DragTimePreview | null =
    moveState.isMoving &&
    moveState.eventId &&
    moveState.previewStart &&
    moveState.previewEnd
      ? {
          eventId: moveState.eventId,
          start: moveState.previewStart,
          end: moveState.previewEnd,
        }
      : null;

  const handleDragStart = (e: DragStartEvent) => {
    const source = eventDragSource(e.operation.source?.data);
    if (!source) return;

    calendar.startEventMove({
      eventId: source.event.id,
      originalStart: source.originalStart,
      originalEnd: source.originalEnd,
      dayDate: source.dayDate,
      granularity: source.granularity,
      ...(source.event.recurrence
        ? { occurrenceStart: source.occurrenceStart ?? source.originalStart }
        : {}),
    });
  };

  const handleDragMove = (e: DragMoveEvent) => {
    const source = eventDragSource(e.operation.source?.data);
    if (!source) return;

    const { x, y } = e.operation.transform;
    for (const element of dragGroupSiblings(source.event.id)) {
      element.style.translate = `${x}px ${y}px`;
      element.style.zIndex = "40";
    }

    calendar.updateEventMove({
      dayDate: dropDay(e.operation.target?.data),
      deltaPixels: y,
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const source = eventDragSource(e.operation.source?.data);
    if (source) {
      for (const element of dragGroupSiblings(source.event.id)) {
        element.style.removeProperty("translate");
        element.style.removeProperty("z-index");
      }
    }

    if (e.canceled) {
      calendar.cancelEventMove();
      return;
    }

    calendar.endEventMove();
  };

  return (
    <DragDropProvider
      plugins={(defaults) => [
        ...defaults,
        Feedback.configure({ feedback: "clone" }),
      ]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <div className="flex gap-3 items-center mb-4 flex-wrap">
            <Button
              onClick={goToPreviousPeriod}
              disabled={!calendar.canGoPreviousPeriod() || calendar.isPending}
              variant="outline"
            >
              ← Previous
            </Button>

            <Button
              onClick={goToToday}
              disabled={calendar.isPending}
              variant="outline"
            >
              Today
            </Button>

            <Button
              onClick={goToNextPeriod}
              disabled={!calendar.canGoNextPeriod() || calendar.isPending}
              variant="outline"
            >
              Next →
            </Button>

            <Button onClick={openAddModal}>+ Add Event</Button>

            <Button
              onClick={calendar.undo}
              disabled={!calendar.canUndo()}
              variant="outline"
              title="Undo"
            >
              ↩ Undo
            </Button>
            <Button
              onClick={calendar.redo}
              disabled={!calendar.canRedo()}
              variant="outline"
              title="Redo"
            >
              ↪ Redo
            </Button>

            <div className="ml-auto flex gap-2">
              <Button
                onClick={() =>
                  calendar.changeViewMode({ value: 1, unit: "month" })
                }
                variant={
                  calendar.viewMode.unit === "month" ? "secondary" : "outline"
                }
                size="sm"
              >
                Month
              </Button>
              <Button
                onClick={() =>
                  calendar.changeViewMode({ value: 1, unit: "week" })
                }
                variant={
                  calendar.viewMode.unit === "week" ? "secondary" : "outline"
                }
                size="sm"
              >
                Week
              </Button>
              <Button
                onClick={() =>
                  calendar.changeViewMode({ value: 1, unit: "day" })
                }
                variant={
                  calendar.viewMode.unit === "day" ? "secondary" : "outline"
                }
                size="sm"
              >
                Day
              </Button>
            </div>
          </div>

          {isScheduleView && (
            <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                Overlap Layout
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {OVERLAP_MODE_ORDER.map((mode) => (
                  <Button
                    key={mode}
                    onClick={() => setOverlapMode(mode)}
                    variant={overlapMode === mode ? "secondary" : "outline"}
                    size="sm"
                  >
                    {overlapModeLabels[mode]}
                  </Button>
                ))}
                <span className="ml-2 text-xs text-neutral-500">
                  {overlapMode === "focus"
                    ? "Custom strategy: reads layout.concurrency / layout.depth"
                    : `Built-in "${overlapModes[overlapMode] as string}" strategy`}
                </span>
              </div>
            </div>
          )}

          <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-neutral-500">
                Calendars
              </span>
              <span className="text-xs text-neutral-500">
                {hiddenEventCount === 0
                  ? "Showing every calendar"
                  : `${hiddenEventCount} of ${loadedEventCount} events filtered out`}
              </span>
              {hiddenEventCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setVisibleCategoryIds(
                      new Set(eventCategories.map((category) => category.id)),
                    )
                  }
                >
                  Show all
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {eventCategories.map((category) => {
                const isVisible = visibleCategoryIds.has(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isVisible}
                    onClick={() => toggleCategory(category.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      isVisible
                        ? "border-neutral-700 bg-black text-neutral-200"
                        : "border-neutral-900 bg-neutral-950 text-neutral-600 line-through"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-sm border border-white/20"
                      style={{
                        backgroundColor: isVisible
                          ? category.swatch
                          : "transparent",
                      }}
                    />
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
            <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
              Capacity Controls
            </div>
            <div className="flex flex-wrap gap-3">
              {resources.map((resource) => {
                const currentCapacity = resource.capacity?.[0] ?? 1;
                return (
                  <div
                    key={resource.id}
                    className="flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-3 py-2"
                  >
                    <span className="text-sm text-neutral-300">
                      {resource.label}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={currentCapacity}
                      onChange={(e) => {
                        const nextCapacity = Math.max(
                          1,
                          Number(e.target.value) || 1,
                        );
                        setResources((prev) =>
                          prev.map((r) =>
                            r.id === resource.id
                              ? { ...r, capacity: [nextCapacity] }
                              : r,
                          ),
                        );
                      }}
                      className="h-8 w-24"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-medium text-neutral-400">
              {calendar.formatPeriod(visibleMonth)}
            </div>
            {overlayCalendars
              .filter((system) => overlayCalendarIds.includes(system.id))
              .map((system) => (
                <div key={system.id} className="text-xs text-neutral-500/80">
                  {calendar.formatPeriod(visibleMonth, {
                    calendar: system.id,
                    locale: system.locale,
                  })}
                </div>
              ))}
          </div>
        </div>

        {isScheduleView ? (
          <ScheduleView
            calendar={calendar}
            days={bufferedScheduleDays}
            resources={resources}
            onEventClick={handleEventClick}
            scrollRef={scheduleScrollRef}
            leftSentinelRef={scheduleLeftRef}
            rightSentinelRef={scheduleRightRef}
            periodDayCount={periodDayCount}
            overlapMode={overlapMode}
            dragPreview={dragPreview}
            overlayCalendarIds={overlayCalendarIds}
          />
        ) : (
          <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black">
            <div
              className="grid border-b border-neutral-800 bg-neutral-950 sticky top-0 z-10"
              style={{
                gridTemplateColumns: `repeat(${dayNames.length}, minmax(0, 1fr))`,
              }}
            >
              {dayNames.map((dayName: string, index: number) => (
                <div
                  key={index}
                  className={`py-3 text-center font-semibold text-sm text-neutral-500 ${
                    index < dayNames.length - 1
                      ? "border-r border-neutral-800"
                      : ""
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            <ScrollArea
              viewportRef={monthScrollRef}
              className="h-[calc(100vh-260px)]"
            >
              <div ref={monthTopRef} style={{ height: 1 }} aria-hidden />

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${dayNames.length}, minmax(0, 1fr))`,
                }}
              >
                {bufferedWeekGroups.map(
                  (
                    week: Array<Day<Resource, DemoEvent> | null>,
                    weekIndex: number,
                  ) => {
                    const weekKey =
                      week.find((d) => d !== null)?.isoDate ?? `w-${weekIndex}`;
                    return week.map((day, dayIndex) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${weekKey}-${dayIndex}`}
                            className={`min-h-[120px] bg-neutral-950/50 ${
                              dayIndex < dayNames.length - 1
                                ? "border-r border-neutral-800"
                                : ""
                            } border-b border-neutral-800`}
                          />
                        );
                      }

                      const isToday = day.isToday;
                      const isInCurrentPeriod = day.isInCurrentPeriod;

                      return (
                        <DayDropZone
                          key={day.isoDate}
                          isoDate={day.isoDate}
                          data-day-date={day.isoDate}
                          className={`min-h-[120px] p-2 relative flex flex-col ${
                            dayIndex < dayNames.length - 1
                              ? "border-r border-neutral-800"
                              : ""
                          } border-b border-neutral-800 ${
                            isToday
                              ? "bg-neutral-900"
                              : isInCurrentPeriod
                                ? "bg-black"
                                : "bg-neutral-950/50"
                          }`}
                        >
                          <div
                            className={`text-sm mb-1 shrink-0 ${
                              isToday
                                ? "font-bold text-white"
                                : isInCurrentPeriod
                                  ? "font-medium text-neutral-200"
                                  : "font-medium text-neutral-500"
                            }`}
                          >
                            {day.dayOfMonth}
                            <OverlayDayParts
                              calendar={calendar}
                              isoDate={day.isoDate}
                              calendarIds={overlayCalendarIds}
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1 min-h-0">
                            {day.allDayEvents.map((event) => {
                              const segment =
                                calendar.getEventSegmentInfo(event);
                              return (
                                <EventDragSource
                                  key={`ad-${event.id}`}
                                  id={`month-all-day-${event.id}-${day.isoDate}`}
                                  data={{
                                    event,
                                    dayDate: day.isoDate,
                                    granularity: "day",
                                    originalStart: segment.originalStart,
                                    originalEnd: segment.originalEnd,
                                    occurrenceStart:
                                      event._occurrenceOriginalStart,
                                  }}
                                >
                                  {(drag) => (
                                    <Badge
                                      ref={drag.ref}
                                      data-drag-group={event.id}
                                      className={`group cursor-grab active:cursor-grabbing text-white border flex items-center gap-1.5 max-w-full shrink-0 w-full ${eventClassOf(event)} ${
                                        drag.isDragging
                                          ? "shadow-xl ring-1 ring-neutral-400"
                                          : ""
                                      }`}
                                      title={event.title}
                                      onClick={() => handleEventClick(event)}
                                    >
                                      <span className="truncate">
                                        {event.title}
                                      </span>
                                    </Badge>
                                  )}
                                </EventDragSource>
                              );
                            })}
                            {day.events.map((event) => {
                              const segment =
                                calendar.getEventSegmentInfo(event);
                              return (
                                <EventDragSource
                                  key={event.id}
                                  id={`month-event-${event.id}-${day.isoDate}`}
                                  data={{
                                    event,
                                    dayDate: day.isoDate,
                                    granularity: "day",
                                    originalStart: segment.originalStart,
                                    originalEnd: segment.originalEnd,
                                    occurrenceStart:
                                      event._occurrenceOriginalStart,
                                  }}
                                >
                                  {(drag) => (
                                    <ContextMenu>
                                      <ContextMenuTrigger className="contents">
                                        <Badge
                                          ref={drag.ref}
                                          data-drag-group={event.id}
                                          variant="secondary"
                                          className={`group cursor-grab active:cursor-grabbing text-white border flex items-center gap-1.5 max-w-full shrink-0 w-full ${eventClassOf(event)} ${
                                            drag.isDragging
                                              ? "shadow-xl ring-1 ring-neutral-400"
                                              : ""
                                          }`}
                                          title={event.title}
                                          onClick={() =>
                                            handleEventClick(event)
                                          }
                                        >
                                          <span className="flex items-center gap-1 min-w-0">
                                            {event.recurrence && (
                                              <span
                                                className="opacity-60 shrink-0"
                                                title="Recurring event"
                                              >
                                                ↻
                                              </span>
                                            )}
                                            <span className="truncate">
                                              {event.title}
                                            </span>
                                          </span>
                                          {event.consumption &&
                                            event.consumption.length > 0 && (
                                              <span
                                                className="text-[10px] leading-none rounded bg-black/40 px-1 py-0.5 font-semibold shrink-0"
                                                title="Consumption"
                                              >
                                                {event.consumption.reduce(
                                                  (a, b) => a + b,
                                                  0,
                                                )}
                                              </span>
                                            )}
                                        </Badge>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent>
                                        <ContextMenuItem
                                          onClick={() => openEditModal(event)}
                                        >
                                          {event.recurrence
                                            ? "Edit this occurrence"
                                            : "Edit event"}
                                        </ContextMenuItem>
                                        {event.recurrence && (
                                          <>
                                            <ContextMenuItem
                                              onClick={() =>
                                                openEditModal(
                                                  event,
                                                  "thisAndFollowing",
                                                )
                                              }
                                            >
                                              Edit this and following
                                            </ContextMenuItem>
                                            <ContextMenuItem
                                              onClick={() =>
                                                openEditModal(event, "all")
                                              }
                                            >
                                              Edit series
                                            </ContextMenuItem>
                                          </>
                                        )}
                                        {event.recurrence && (
                                          <>
                                            <ContextMenuSeparator />
                                            <ContextMenuItem
                                              onClick={() =>
                                                calendar.goToPreviousOccurrence(
                                                  event.id,
                                                  event.start,
                                                )
                                              }
                                            >
                                              ← Previous occurrence
                                            </ContextMenuItem>
                                            <ContextMenuItem
                                              onClick={() =>
                                                calendar.goToNextOccurrence(
                                                  event.id,
                                                  event.start,
                                                )
                                              }
                                            >
                                              Next occurrence →
                                            </ContextMenuItem>
                                          </>
                                        )}
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  )}
                                </EventDragSource>
                              );
                            })}
                          </div>
                        </DayDropZone>
                      );
                    });
                  },
                )}
              </div>

              <div ref={monthBottomRef} style={{ height: 1 }} aria-hidden />
            </ScrollArea>
          </div>
        )}

        {calendar.isPending && (
          <div className="fixed top-5 right-5 px-5 py-3 bg-card border border-border text-foreground rounded-md text-sm font-medium">
            Loading...
          </div>
        )}

        <ScopeChoiceModal
          event={scopeChoiceEvent}
          isOpen={!!scopeChoiceEvent}
          onSelect={(scope) => {
            if (scopeChoiceEvent) {
              openEditModal(scopeChoiceEvent, scope);
            }
            setScopeChoiceEvent(null);
          }}
          onClose={() => setScopeChoiceEvent(null)}
        />

        <ScopeChoiceModal
          event={null}
          title="Resize recurring event"
          isOpen={!!resizeScopeChoice}
          onSelect={(scope) => {
            const pending = resizeScopeChoice;
            setResizeScopeChoice(null);
            if (!pending) return;
            void calendar
              .editRecurringEvent(
                pending.eventId,
                { start: pending.newStart, end: pending.newEnd },
                { scope, occurrenceStart: pending.occurrenceStart },
              )
              .then((result) => {
                if (!result.success) setResizeError(result.error);
              });
          }}
          onClose={() => setResizeScopeChoice(null)}
        />

        <EventModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={modalState.mode === "edit" ? handleDelete : undefined}
          initialData={modalState.initialData}
          mode={modalState.mode}
          isRecurring={modalState.isRecurring}
          isSaving={isSaving}
          resources={resources}
        />

        <ScopeChoiceModal
          event={null}
          title="Move recurring event"
          isOpen={!!moveScopeChoice}
          onSelect={(scope) => {
            const pending = moveScopeChoice;
            setMoveScopeChoice(null);
            if (!pending) return;
            void calendar
              .editRecurringEvent(
                pending.eventId,
                { start: pending.newStart, end: pending.newEnd },
                { scope, occurrenceStart: pending.occurrenceStart },
              )
              .then((result) => {
                if (!result.success) setMoveError(result.error);
              });
          }}
          onClose={() => setMoveScopeChoice(null)}
        />

        {resizeError && (
          <ResizeErrorToast
            error={resizeError}
            onDismiss={() => setResizeError(null)}
          />
        )}

        {moveError && (
          <ResizeErrorToast
            error={moveError}
            title="Cannot Move Event"
            onDismiss={() => setMoveError(null)}
          />
        )}
      </div>
    </DragDropProvider>
  );
}
