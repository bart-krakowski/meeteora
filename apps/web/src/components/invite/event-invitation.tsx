import {
  ArrowUpRight01Icon,
  Calendar03Icon,
  Location01Icon,
  Ticket01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { GeistSerif } from "geist/font/serif";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  formatEventDate,
  formatEventTime,
  formatPrice,
  formatShortDate,
  initials,
} from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { Registration } from "./registration";
import { ShareButton } from "./share-button";

/**
 * A public event invitation: one centered, typeset composition.
 * Monochrome, drawn entirely from the app's theme tokens, so it follows the
 * app theme (dark by default).
 */
export function EventInvitation({ event }: { event: PublicEvent }) {
  const { location, organizer } = event;

  return (
    <main className="invite min-h-dvh bg-background text-foreground antialiased selection:bg-foreground selection:text-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-5 pt-5 pb-8 sm:px-10 sm:pt-8">
        <header className="flex h-9 items-center justify-between gap-4 text-[13px]">
          <p className="truncate text-muted-foreground">
            <span className="text-foreground">{organizer.name}</span> invites you
          </p>
          <ShareButton title={event.title} />
        </header>

        {event.cover && (
          <div className="relative mt-5 aspect-[7/2] overflow-hidden rounded-[4px] border border-foreground/10 bg-muted max-sm:aspect-[3/1] sm:mt-6">
            <Image
              src={event.cover.src}
              alt={event.cover.alt}
              fill
              priority
              sizes="(max-width: 720px) 100vw, 640px"
              className="object-cover object-[30%_45%] contrast-[1.08] grayscale dark:brightness-[0.8]"
            />
          </div>
        )}

        <section aria-labelledby="event-title" className="mt-7 sm:mt-10">
          <p className="text-[12px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {event.category}
            <span aria-hidden className="mx-2 text-foreground/25">/</span>
            <span className="tabular-nums">
              {formatShortDate(event.startsAt, event.timeZone)}
            </span>
          </p>
          <h1
            id="event-title"
            className={`${GeistSerif.className} mt-3 text-[48px] leading-[0.96] tracking-[-0.035em] text-balance sm:text-[92px]`}
          >
            {event.title}
          </h1>
          <p className="mt-5 max-w-[54ch] text-[16px] leading-[1.6] text-pretty text-muted-foreground sm:text-[17px]">
            {event.description}
          </p>
        </section>

        <dl className="mt-7 grid sm:mt-8 border-t border-foreground/10 sm:grid-cols-2">
          <Meta icon={Calendar03Icon} label="Date">
            {formatEventDate(event)}
            <Secondary>{formatEventTime(event)}</Secondary>
          </Meta>
          <Meta icon={Location01Icon} label="Location">
            {location.venue}
            <Secondary>
              {location.area}, {location.city}
            </Secondary>
          </Meta>
          <Meta icon={Ticket01Icon} label="Ticket">
            {formatPrice(event.price)}
            {event.price?.note && <Secondary>{event.price.note}</Secondary>}
          </Meta>
          <Meta icon={UserGroupIcon} label="Capacity">
            {event.capacity === null ? "Open attendance" : `${event.capacity} seats`}
            <Secondary>
              {event.status === "closed"
                ? "Registration closed"
                : `Registration closes ${formatShortDate(event.registrationClosesAt, event.timeZone)}`}
            </Secondary>
          </Meta>
        </dl>

        <Registration event={event} />

        <section
          aria-label="Organizer"
          className="mt-12 flex items-center gap-4 border-t border-foreground/10 pt-6 sm:mt-14"
        >
          <span
            aria-hidden
            className={`${GeistSerif.className} grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-[17px] text-background`}
          >
            {initials(organizer.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground">Hosted by</p>
            <p className="truncate text-[15px] font-medium">{organizer.name}</p>
            {organizer.bio && (
              <p className="truncate text-[14px] text-muted-foreground max-sm:hidden">
                {organizer.bio}
              </p>
            )}
          </div>
          {organizer.url && (
            <a
              href={organizer.url}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-9 shrink-0 items-center gap-1 rounded-[6px] border border-foreground/12 px-3 text-[13px] font-medium transition-[border-color,background-color,transform] hover:border-foreground/30 hover:bg-muted active:scale-[0.98]"
            >
              Profile
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={14}
                strokeWidth={1.8}
                className="transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
              />
            </a>
          )}
        </section>

        <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-1 pt-12 text-[12px] text-muted-foreground">
          <span>{event.cover?.credit}</span>
          <span>Hosted on Scheduler</span>
        </footer>
      </div>
    </main>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  icon: IconSvgElement;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-foreground/10 py-3 sm:py-4 sm:odd:pr-6 sm:even:border-l sm:even:pl-6">
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.6}
        className="mt-[3px] shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-[15px] leading-[1.45] font-medium">{children}</dd>
      </div>
    </div>
  );
}

function Secondary({ children }: { children: ReactNode }) {
  return <span className="block font-normal text-muted-foreground">{children}</span>;
}
