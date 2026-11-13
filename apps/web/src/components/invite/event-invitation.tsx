import { GeistSerif } from "geist/font/serif";
import { encode } from "uqr";
import {
  formatDotDate,
  formatDuration,
  formatEventDate,
  formatEventTime,
  formatPrice,
  formatShortDate,
} from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { EventCard, type CardText } from "./event-card";

/**
 * The public event page: one business card on a dark ground, shown front
 * then back. The front is the name set as a type specimen, the back is the
 * ticket with the details and the one action. Everything is drawn from the event, nothing is sample.
 */
export function EventInvitation({ event, url }: { event: PublicEvent; url: string }) {
  const { location, organizer } = event;
  const year = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: event.timeZone }).format(
    new Date(event.startsAt),
  );

  const text: CardText = {
    year,
    dotDate: formatDotDate(event.startsAt, event.timeZone),
    date: formatEventDate(event),
    shortDate: new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: event.timeZone,
    }).format(new Date(event.startsAt)),
    time: formatEventTime(event),
    duration: formatDuration(event),
    place: `${location.venue}, ${location.city}`,
    address: `${location.area}, ${location.city}`,
    price: formatPrice(event.price),
    closes: `Registration closes ${formatShortDate(event.registrationClosesAt, event.timeZone)}`,
    host: organizer.name,
    hostRole: organizer.bio?.replace(/\.$/, "") ?? null,
    shortUrl: url.replace(/^https?:\/\//, ""),
  };

  return (
    <main
      className={[
        "relative isolate flex-1 min-h-dvh overflow-hidden bg-background font-sans text-foreground antialiased",
        "selection:bg-foreground selection:text-background",
        "[&_:is(button,a):focus-visible]:outline-2 [&_:is(button,a):focus-visible]:outline-offset-3 [&_:is(button,a):focus-visible]:outline-foreground",
        // Ground: one soft blurred greyscale form.
        "before:fixed before:top-1/2 before:left-1/2 before:-z-2 before:h-[46vmax] before:w-[70vmax] before:-translate-1/2 before:-rotate-12 before:rounded-full before:bg-muted before:opacity-50 before:blur-[90px]",
      ].join(" ")}
    >
      <EventCard
        event={event}
        text={text}
        url={url}
        qr={qrPath(url)}
        serifClass={GeistSerif.className}
      />
    </main>
  );
}

/** The QR code as one SVG path, one unit per module, quiet zone included. */
function qrPath(url: string) {
  const { data, size } = encode(url, { ecc: "M", border: 0 });
  let d = "";
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) d += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return { d, size };
}
