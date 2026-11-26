import { RpcException } from "@nestjs/microservices";
import type {
  ResourceHours,
  RpcError,
  TimeRange,
  Weekday,
  WeeklyHours,
} from "@meeteora/contracts";

const HM = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGES_PER_DAY = 8;
const MAX_DAYS_OFF = 366;

function rpcError(status: number, message: string): RpcException {
  return new RpcException({ status, message } satisfies RpcError);
}

export function byWeekday<T>(value: (day: Weekday) => T): Record<Weekday, T> {
  return {
    monday: value("monday"),
    tuesday: value("tuesday"),
    wednesday: value("wednesday"),
    thursday: value("thursday"),
    friday: value("friday"),
    saturday: value("saturday"),
    sunday: value("sunday"),
  };
}

function validRanges(day: Weekday, ranges: unknown): Array<TimeRange> {
  if (!Array.isArray(ranges)) throw rpcError(400, `${day} must be a list`);
  if (ranges.length > MAX_RANGES_PER_DAY) {
    throw rpcError(400, `${day} can have at most ${MAX_RANGES_PER_DAY} ranges`);
  }
  const parsed = ranges.map((range: Partial<TimeRange> | null) => {
    const { start, end } = range ?? {};
    if (typeof start !== "string" || typeof end !== "string") {
      throw rpcError(400, `${day}: each range needs a start and an end`);
    }
    if (!HM.test(start) || !HM.test(end)) {
      throw rpcError(400, `${day}: times must be HH:MM`);
    }
    if (end <= start) {
      throw rpcError(400, `${day}: ${start}–${end} ends before it starts`);
    }
    return { start, end };
  });
  const sorted = parsed.toSorted((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      throw rpcError(
        400,
        `${day}: ${sorted[i - 1].start}–${sorted[i - 1].end} overlaps ${sorted[i].start}–${sorted[i].end}`,
      );
    }
  }
  return sorted;
}

function isIsoDate(day: unknown): day is string {
  return (
    typeof day === "string" &&
    ISO_DATE.test(day) &&
    !Number.isNaN(Date.parse(`${day}T00:00:00Z`))
  );
}

export function validWeekly(weekly: unknown): WeeklyHours {
  if (typeof weekly !== "object" || weekly === null) {
    throw rpcError(400, "weekly must be an object");
  }
  const days: Partial<Record<Weekday, unknown>> = weekly;
  return byWeekday((day) => validRanges(day, days[day] ?? []));
}

export function validDaysOff(daysOff: unknown): Array<string> {
  if (!Array.isArray(daysOff)) throw rpcError(400, "daysOff must be a list");
  if (daysOff.length > MAX_DAYS_OFF) {
    throw rpcError(400, `At most ${MAX_DAYS_OFF} days off`);
  }
  const days: Array<string> = [];
  for (const day of daysOff as Array<unknown>) {
    if (!isIsoDate(day)) throw rpcError(400, `Invalid day off: ${String(day)}`);
    days.push(day);
  }
  return [...new Set(days)].toSorted();
}

/** Reads stored jsonb defensively: unknown weekdays are dropped, missing ones closed. */
export function storedHours(row: {
  weekly: Record<string, Array<TimeRange>>;
  daysOff: Array<string>;
}): ResourceHours {
  return {
    weekly: byWeekday((day) => row.weekly[day] ?? []),
    daysOff: row.daysOff,
  };
}
