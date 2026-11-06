import type { EventPrice, PublicEvent } from "./types";

export function formatEventDate(event: Pick<PublicEvent, "startsAt" | "timeZone">) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: event.timeZone,
  }).format(new Date(event.startsAt));
}

/** "19:00 – 22:30 CET" */
export function formatEventTime(
  event: Pick<PublicEvent, "startsAt" | "endsAt" | "timeZone">,
) {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timeZone,
  });
  const zone =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: event.timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date(event.startsAt))
      .find((part) => part.type === "timeZoneName")?.value ?? "";
  return `${time.format(new Date(event.startsAt))} – ${time.format(new Date(event.endsAt))} ${zone}`.trim();
}

/** "3 Dec" */
export function formatShortDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(iso));
}

export function formatPrice(price: EventPrice | null) {
  if (!price) return "Free";
  const whole = price.amount % 100 === 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: price.currency,
    currencyDisplay: "code",
    minimumFractionDigits: whole ? 0 : 2,
  })
    .format(price.amount / 100)
    .replace(/\u00a0/g, " ");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
}

const icsStamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsEscape = (text: string) =>
  text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/** A minimal iCalendar file for "Add to calendar". */
export function toIcs(event: PublicEvent, url: string) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Scheduler//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.slug}@scheduler`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(event.startsAt)}`,
    `DTEND:${icsStamp(event.endsAt)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(`${event.location.venue}, ${event.location.area}, ${event.location.city}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
