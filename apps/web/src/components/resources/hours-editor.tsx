"use client";

import {
  type ResourceHours,
  type TimeRange,
  type Weekday,
  type WeeklyHours,
  WEEKDAYS,
} from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import { Checkbox } from "@meeteora/ui/components/checkbox";
import { Field, FieldLabel } from "@meeteora/ui/components/field";
import { CloseIcon, CopyIcon, PlusIcon } from "@meeteora/ui/components/icons";
import { Input } from "@meeteora/ui/components/input";
import { useId, useState } from "react";

const DAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_SHORT: Record<Weekday, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const DEFAULT_RANGE: TimeRange = { start: "09:00", end: "17:00" };
const MAX_RANGES_PER_DAY = 8;

const dayOffFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDayOff(day: string): string {
  return dayOffFormat.format(new Date(`${day}T00:00:00Z`));
}

/** Per-day problems, so Save can stay disabled until they're fixed. */
export function rangeErrors(
  weekly: WeeklyHours,
): Partial<Record<Weekday, string>> {
  const errors: Partial<Record<Weekday, string>> = {};
  for (const day of WEEKDAYS) {
    const ranges = weekly[day].toSorted((a, b) =>
      a.start.localeCompare(b.start),
    );
    for (const [index, range] of ranges.entries()) {
      if (!range.start || !range.end) {
        errors[day] = "Fill in both times.";
      } else if (range.end <= range.start) {
        errors[day] = `${range.start}–${range.end} ends before it starts.`;
      } else if (index > 0 && range.start < ranges[index - 1].end) {
        errors[day] = "Ranges overlap.";
      }
      if (errors[day]) break;
    }
  }
  return errors;
}

function formatRanges(ranges: Array<TimeRange>): string {
  return ranges.map((range) => `${range.start}–${range.end}`).join(", ");
}

/** One line for a table cell, e.g. "Mon–Fri 09:00–17:00 · 2 days off". */
export function summarizeHours({ weekly, daysOff }: ResourceHours): string {
  const groups: Array<{ from: Weekday; to: Weekday; hours: string }> = [];
  for (const day of WEEKDAYS) {
    if (weekly[day].length === 0) continue;
    const hours = formatRanges(weekly[day]);
    const last = groups.at(-1);
    const previousDay = WEEKDAYS[WEEKDAYS.indexOf(day) - 1];
    if (last && last.hours === hours && last.to === previousDay) {
      last.to = day;
    } else {
      groups.push({ from: day, to: day, hours });
    }
  }
  const weeklyText =
    groups.length === 0
      ? "Closed"
      : groups
          .map(({ from, to, hours }) =>
            from === to
              ? `${DAY_SHORT[from]} ${hours}`
              : `${DAY_SHORT[from]}–${DAY_SHORT[to]} ${hours}`,
          )
          .join("; ");
  const count = daysOff.length;
  return count === 0
    ? weeklyText
    : `${weeklyText} · ${count} ${count === 1 ? "day" : "days"} off`;
}

export function WeeklyHoursEditor({
  value,
  onChange,
}: {
  value: WeeklyHours;
  onChange: (weekly: WeeklyHours) => void;
}) {
  const errors = rangeErrors(value);
  const setDay = (day: Weekday, ranges: Array<TimeRange>) =>
    onChange({ ...value, [day]: ranges });

  const copyToWeekdays = (from: Weekday) => {
    const weekly = { ...value };
    for (const day of WEEKDAYS) {
      if (day === "saturday" || day === "sunday") continue;
      weekly[day] = value[from].map((range) => ({ ...range }));
    }
    onChange(weekly);
  };

  return (
    <div className="flex flex-col divide-y">
      {WEEKDAYS.map((day) => {
        const ranges = value[day];
        const open = ranges.length > 0;
        return (
          <div
            key={day}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start"
          >
            <label className="flex h-9 w-32 shrink-0 items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={open}
                onCheckedChange={(checked) =>
                  setDay(day, checked ? [{ ...DEFAULT_RANGE }] : [])
                }
              />
              {DAY_LABELS[day]}
            </label>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {!open && (
                <p className="flex h-9 items-center text-sm text-muted-foreground">
                  Closed
                </p>
              )}
              {ranges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    step={900}
                    value={range.start}
                    aria-label={`${DAY_LABELS[day]} range ${index + 1} start`}
                    aria-invalid={Boolean(errors[day])}
                    className="w-32 tabular-nums"
                    onChange={(event) =>
                      setDay(
                        day,
                        ranges.map((r, i) =>
                          i === index ? { ...r, start: event.target.value } : r,
                        ),
                      )
                    }
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="time"
                    step={900}
                    value={range.end}
                    aria-label={`${DAY_LABELS[day]} range ${index + 1} end`}
                    aria-invalid={Boolean(errors[day])}
                    className="w-32 tabular-nums"
                    onChange={(event) =>
                      setDay(
                        day,
                        ranges.map((r, i) =>
                          i === index ? { ...r, end: event.target.value } : r,
                        ),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove range"
                    onClick={() =>
                      setDay(
                        day,
                        ranges.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <CloseIcon />
                  </Button>
                </div>
              ))}
              {errors[day] && (
                <p className="text-sm text-destructive">{errors[day]}</p>
              )}
            </div>
            {open && (
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Add a range on ${DAY_LABELS[day]}`}
                  title="Add a range"
                  disabled={ranges.length >= MAX_RANGES_PER_DAY}
                  onClick={() => {
                    const last = ranges.at(-1);
                    setDay(day, [
                      ...ranges,
                      last && last.end < "23:00"
                        ? { start: last.end, end: "23:00" }
                        : { ...DEFAULT_RANGE },
                    ]);
                  }}
                >
                  <PlusIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Copy ${DAY_LABELS[day]} to Monday–Friday`}
                  title="Copy to Monday–Friday"
                  onClick={() => copyToWeekdays(day)}
                >
                  <CopyIcon />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DaysOffEditor({
  value,
  onChange,
  timeZone,
}: {
  value: Array<string>;
  onChange: (daysOff: Array<string>) => void;
  timeZone: string;
}) {
  const [newDayOff, setNewDayOff] = useState("");
  const dayOffId = useId();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(),
  );
  const canAdd = Boolean(newDayOff) && !value.includes(newDayOff);

  const add = () => {
    if (!canAdd) return;
    onChange([...value, newDayOff].toSorted());
    setNewDayOff("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <Field className="gap-2">
          <FieldLabel htmlFor={dayOffId}>Date</FieldLabel>
          <Input
            id={dayOffId}
            type="date"
            min={today}
            value={newDayOff}
            onChange={(event) => setNewDayOff(event.target.value)}
            onKeyDown={(event) => {
              // Enter adds the date instead of submitting the surrounding form.
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            className="w-44"
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          disabled={!canAdd}
          onClick={add}
        >
          Add day off
        </Button>
      </div>
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No days off.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {value.map((day) => (
            <li
              key={day}
              className={
                day < today
                  ? "flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm text-muted-foreground"
                  : "flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
              }
            >
              {formatDayOff(day)}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${formatDayOff(day)}`}
                onClick={() => onChange(value.filter((d) => d !== day))}
              >
                <CloseIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
