export const TIME_ZONE = "Europe/Warsaw";

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIME_ZONE,
});

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** YYYY-MM-DD in the app time zone, for grouping by calendar day. */
export function dayKey(iso: string): string {
  return dayKeyFormat.format(new Date(iso));
}

const dayHeadingFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

export function formatDayHeading(iso: string): string {
  return dayHeadingFormat.format(new Date(iso));
}

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

const shortDateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "Mon 16 Nov, 09:00": compact, for dense lists. */
export function formatShortDateTime(iso: string): string {
  return shortDateTimeFormat.format(new Date(iso));
}

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const [unit, size] =
    RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size) ??
    RELATIVE_UNITS[RELATIVE_UNITS.length - 1];
  return relativeFormat.format(Math.round(seconds / size), unit);
}
