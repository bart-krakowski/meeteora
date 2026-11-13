"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, Fragment, useEffect, useRef, useState } from "react";
import { initials } from "@/lib/events/format";
import type { PublicEvent } from "@/lib/events/types";
import { downloadIcs, Registration } from "./registration";

export interface CardText {
  year: string;
  dotDate: string;
  date: string;
  shortDate: string;
  time: string;
  duration: string;
  place: string;
  address: string;
  price: string;
  closes: string;
  host: string;
  hostRole: string | null;
  shortUrl: string;
}

const REFRESH_MS = 30_000;
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The card: one face, set as a type specimen. The name leads, the details
 * sit on hairline rows under it, and the ticket stub holds the live count,
 * the QR code and Register. On a mouse the card leans toward the pointer.
 */
export function EventCard({
  event,
  text,
  url,
  qr,
  serifClass,
}: {
  event: PublicEvent;
  text: CardText;
  url: string;
  qr: { d: string; size: number };
  serifClass: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const router = useRouter();

  // Live capacity: the server numbers are re-read while the page is open.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // The count starts once the card has settled.
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), prefersReducedMotion() ? 0 : 700);
    return () => clearTimeout(id);
  }, []);

  // The card leans a few degrees toward a fine pointer.
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches || prefersReducedMotion()) return;
    const root = document.documentElement;
    let frame = 0;
    const onMove = (pointer: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = pointer.clientX / window.innerWidth - 0.5;
        const y = pointer.clientY / window.innerHeight - 0.5;
        root.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
        root.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      root.style.removeProperty("--tilt-x");
      root.style.removeProperty("--tilt-y");
    };
  }, []);

  const words = event.title.trim().split(/\s+/);
  const fit = titleFit(event.title);

  return (
    <section
      aria-labelledby="event-title"
      style={{ "--grain": `url("${GRAIN}")` } as CSSProperties}
      className={cx(
        "relative grid min-h-dvh w-full place-items-center overflow-clip px-(--edge) py-6",
        "[--edge:64px] min-[1200px]:[--edge:120px] max-sm:py-4 max-sm:[--edge:16px]",
        // Grain over the ground.
        "after:pointer-events-none after:absolute after:inset-0 after:-z-1 after:bg-(image:--grain) after:opacity-[0.07]",
      )}
    >
      {/* Card size: 85:55 landscape, as wide as the side margins allow, else as tall as the
          screen allows; a 55:85 (or taller) portrait card on phones. */}
      <div className="relative z-1 flex flex-col items-center gap-[22px] [--card-w:min(calc(100vw_-_var(--edge)_*_2),calc((100dvh_-_124px)_*_85_/_55))] max-sm:gap-3.5 max-sm:[--card-w:calc(100vw_-_32px)]">
        <div
          data-revealed={revealed || undefined}
          style={{ "--fit-l": fit.landscape, "--fit-p": fit.portrait } as CSSProperties}
          className="group/scene aspect-85/55 w-[max(300px,var(--card-w))] perspective-[2200px] max-sm:aspect-auto max-sm:w-[max(288px,var(--card-w))]"
        >
          <div className="relative size-full transform-3d [transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:transition-transform motion-safe:duration-600 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-92 motion-safe:slide-in-from-bottom-12 motion-safe:spin-in-[-5deg] motion-safe:[--tw-animation-duration:1.2s] motion-safe:fill-mode-backwards max-sm:h-auto">
            {/* Behind the face: its near-black fill is what shows through the notches. */}
            <div
              aria-hidden
              className="absolute inset-0 [transform:translateZ(-2px)] rounded-[16px] bg-black shadow-[0_60px_120px_-40px_rgb(0_0_0/0.95),0_24px_48px_-24px_rgb(0_0_0/0.8)]"
            />
            {/* The face: body on the left, ticket stub on the right, notched where the stub tears off. */}
            <div
              className={cx(
                "absolute inset-0 grid grid-cols-[1fr_var(--stub)] grid-rows-1 overflow-hidden rounded-[16px] border border-border bg-card [container-type:size]",
                "[--notch:clamp(11px,1.25cqi,15px)] [--pad:clamp(18px,3cqi,36px)] [--stub:24%]",
                "mask-intersect [mask-image:radial-gradient(circle_var(--notch)_at_calc(100%_-_var(--stub))_0%,transparent_98%,#000),radial-gradient(circle_var(--notch)_at_calc(100%_-_var(--stub))_100%,transparent_98%,#000)]",
                "max-sm:relative max-sm:min-h-[calc(var(--card-w)_*_85_/_55)] max-sm:grid-cols-1 max-sm:grid-rows-[1fr_var(--stub-h)] max-sm:[container-type:inline-size]",
                "max-sm:[--notch:12px] max-sm:[--pad:18px] max-sm:[--stub-h:232px]",
                "max-sm:[mask-image:radial-gradient(circle_var(--notch)_at_0_calc(100%_-_var(--stub-h)),transparent_98%,#000),radial-gradient(circle_var(--notch)_at_100%_calc(100%_-_var(--stub-h)),transparent_98%,#000)]",
              )}
            >
              <div
                className={cx(
                  "relative grid min-h-0 min-w-0 grid-rows-[auto_1fr_auto] gap-[clamp(10px,1.8cqi,22px)] p-(--pad) max-sm:gap-4",
                  // The four-column specimen grid (two on phones).
                  "before:pointer-events-none before:absolute before:inset-x-(--pad) before:inset-y-0 before:border-x before:border-border/60 before:bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px)] before:bg-size-[25%_100%] max-sm:before:bg-size-[50%_100%]",
                )}
              >
                <Crops />
                {/* Tags left, the host in the corner like the name on a business card. */}
                <div className="relative flex min-w-0 items-start justify-between gap-6">
                  <p className={cx(mono, "flex gap-x-[1.8em] text-muted-foreground")}>
                    <span className="text-foreground">01</span>
                    <span>{event.category}</span>
                    <span className={narrowHidden}>{text.year}</span>
                  </p>
                  <p className="flex flex-col items-end gap-px text-right">
                    <span className="text-[clamp(14px,1.3cqi,16px)] leading-[1.2] font-medium tracking-[-0.01em] text-foreground">
                      {text.host}
                    </span>
                    {text.hostRole && (
                      <span className={cx(mono, narrowHidden, "text-muted-foreground")}>{text.hostRole}</span>
                    )}
                  </p>
                </div>

                {/* As wide as the body, never taller than its share of the card. */}
                <div className="relative self-end text-(length:--size) [--size:min(calc(var(--fit-l)_*_0.7cqi),22cqh)] max-sm:pt-3 max-sm:[--size:calc(var(--fit-p)_*_0.8cqi)]">
                  <Guide label="Geist Serif" className="top-[0.06em]" />
                  <Guide label="Baseline" className="bottom-[0.115em]" />
                  <h1
                    id="event-title"
                    className={cx(
                      "relative -ml-[0.04em] text-[1em] leading-[0.9] font-normal tracking-[-0.045em] text-balance text-foreground",
                      serifClass,
                    )}
                  >
                    {words.map((word, index) => (
                      <Fragment key={`${word}-${index}`}>
                        {index > 0 && " "}
                        <span className="inline-block align-top" style={{ "--i": index } as CSSProperties}>
                          <span className="inline-block motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[0.45em] motion-safe:duration-1100 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:delay-[calc(450ms_+_var(--i)_*_80ms)] motion-safe:fill-mode-backwards">
                            {word}
                          </span>
                        </span>
                      </Fragment>
                    ))}
                  </h1>
                </div>

                <dl className="relative border-t border-border">
                  <Row label="When" value={text.shortDate} detail={`${text.time} · ${text.duration}`} />
                  <Row label="Where" value={event.location.venue} detail={text.address} />
                  <Row label="Price" value={text.price} detail={event.price?.note ?? null} />
                </dl>
              </div>

              {/* Stub: date, the live count, the link, Register. Moves under the body on phones. */}
              <div
                className={cx(
                  "relative flex min-h-0 min-w-0 flex-col justify-between gap-[clamp(10px,1.6cqi,20px)] px-[calc(var(--pad)_*_0.75)] py-(--pad)",
                  "max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:grid-rows-[1fr_auto] max-sm:content-between max-sm:gap-x-4 max-sm:gap-y-3.5 max-sm:px-(--pad) max-sm:py-[18px]",
                  // A hairline ring around each notch, so the cut reads against the dark ground.
                  "before:pointer-events-none before:absolute before:top-[calc(-1_*_var(--notch)_-_2px)] before:left-[calc(-1_*_var(--notch)_-_0.5px)] before:aspect-square before:w-[calc(var(--notch)_*_2_+_2px)] before:rounded-full before:border before:border-foreground/20",
                  "after:pointer-events-none after:absolute after:bottom-[calc(-1_*_var(--notch)_-_2px)] after:left-[calc(-1_*_var(--notch)_-_0.5px)] after:aspect-square after:w-[calc(var(--notch)_*_2_+_2px)] after:rounded-full after:border after:border-foreground/20",
                  "max-sm:before:top-[calc(-1_*_var(--notch))] max-sm:before:left-[calc(-1_*_var(--notch)_-_2px)]",
                  "max-sm:after:top-[calc(-1_*_var(--notch))] max-sm:after:right-[calc(-1_*_var(--notch)_-_2px)] max-sm:after:bottom-auto max-sm:after:left-auto",
                )}
              >
                {/* Perforation */}
                <span
                  aria-hidden
                  className="absolute top-[calc(var(--notch)_+_6px)] bottom-[calc(var(--notch)_+_6px)] -left-px border-l border-dashed border-foreground/15 max-sm:-top-px max-sm:right-[calc(var(--notch)_+_6px)] max-sm:bottom-auto max-sm:left-[calc(var(--notch)_+_6px)] max-sm:border-t max-sm:border-l-0"
                />
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 max-sm:hidden">
                  <span className={cx(mono, "text-foreground")}>{text.dotDate}</span>
                  <span
                    aria-hidden
                    className={cx(
                      "text-[clamp(18px,2.2cqi,28px)] leading-none tracking-[-0.02em] whitespace-nowrap text-foreground",
                      serifClass,
                    )}
                  >
                    Admit one
                  </span>
                </p>

                <Capacity event={event} active={revealed} serifClass={serifClass} closes={text.closes} />

                <div className="flex min-w-0 items-center gap-3 max-sm:self-start">
                  <svg
                    className="h-auto w-[clamp(52px,7cqi,84px)] flex-none max-sm:w-[72px]"
                    viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
                    role="img"
                    aria-label={`QR code for ${text.shortUrl}`}
                    shapeRendering="crispEdges"
                  >
                    <rect
                      x="-2"
                      y="-2"
                      width={qr.size + 4}
                      height={qr.size + 4}
                      rx="1.2"
                      className="fill-foreground"
                    />
                    <path d={qr.d} className="fill-background" />
                  </svg>
                  <p className={cx(mono, "flex min-w-0 flex-col text-muted-foreground max-sm:hidden")}>
                    <span className="text-foreground">Event link</span>
                    <span className={cx("tracking-[0.02em] normal-case wrap-anywhere", narrowHidden)}>
                      {text.shortUrl}
                    </span>
                  </p>
                </div>

                <Registration event={event} className="w-full max-sm:col-span-full" />
              </div>
            </div>
          </div>
        </div>

        <Actions event={event} url={url} />
      </div>
    </section>
  );
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

/** Small caps-style label text; sizes follow the card (container) width. */
const monoFace = "font-mono tracking-[0.06em] uppercase";
const mono = `${monoFace} text-[clamp(10px,0.95cqi,11.5px)] leading-[1.45] max-sm:text-[10.5px]`;

/** Dropped on a narrow landscape card (tablets) so the stub keeps the count, the QR and Register. */
const narrowHidden = "@max-[760px]:hidden";

const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const cropClass = cx(
  "pointer-events-none absolute size-[9px] -translate-1/2",
  "before:absolute before:inset-x-0 before:top-1 before:h-px before:bg-foreground/15",
  "after:absolute after:inset-y-0 after:left-1 after:w-px after:bg-foreground/15",
);

/** Crop marks in the body's corners, half the padding in from each edge. */
function Crops() {
  return (
    <>
      <span aria-hidden className={cx(cropClass, "top-[calc(var(--pad)_*_0.5)] left-[calc(var(--pad)_*_0.5)]")} />
      <span aria-hidden className={cx(cropClass, "top-[calc(var(--pad)_*_0.5)] left-[calc(100%_-_var(--pad)_*_0.5)]")} />
      <span aria-hidden className={cx(cropClass, "top-[calc(100%_-_var(--pad)_*_0.5)] left-[calc(var(--pad)_*_0.5)]")} />
      <span aria-hidden className={cx(cropClass, "top-[calc(100%_-_var(--pad)_*_0.5)] left-[calc(100%_-_var(--pad)_*_0.5)]")} />
    </>
  );
}

/** A dashed typographic guide line across the body, labelled at the right. */
function Guide({ label, className }: { label: string; className: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "pointer-events-none absolute right-[calc(var(--pad)_*_-1)] left-[calc(var(--pad)_*_-1)] h-0 border-t border-dashed border-foreground/15",
        className,
      )}
    >
      <span
        className={cx(
          monoFace,
          narrowHidden,
          "absolute right-(--pad) bottom-1 text-[clamp(9px,0.85cqi,10.5px)] leading-none text-muted-foreground",
        )}
      >
        {label}
      </span>
    </span>
  );
}

function Row({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string | null;
}) {
  return (
    <div className="grid grid-cols-[9ch_1fr] items-baseline gap-4 border-b border-border py-[clamp(7px,1.1cqi,14px)] max-sm:grid-cols-[6.5ch_1fr] max-sm:gap-2.5 max-sm:py-2">
      <dt className={cx(mono, "text-muted-foreground")}>{label}</dt>
      <dd className="flex min-w-0 items-baseline justify-between gap-4 max-sm:grid max-sm:gap-px">
        <span className="text-[clamp(14px,1.3cqi,15.5px)] font-medium tracking-[-0.005em] whitespace-nowrap text-foreground max-sm:text-[14px] max-sm:whitespace-normal">
          {value}
        </span>
        {detail && (
          <span className="overflow-hidden text-right text-[clamp(13px,1.15cqi,14px)] text-ellipsis whitespace-nowrap text-muted-foreground @max-[760px]:text-[12.5px] max-sm:text-left max-sm:whitespace-normal">
            {detail}
          </span>
        )}
      </dd>
    </div>
  );
}

const avatarClass =
  "grid h-[30px] flex-none place-items-center rounded-full font-mono text-[10px] font-medium tracking-[0.02em] max-sm:h-7 motion-safe:group-data-revealed/scene:animate-in fade-in zoom-in-60 slide-in-from-bottom-1.5 duration-550 ease-[cubic-bezier(0.16,1,0.3,1)] delay-[calc(100ms_+_var(--i)_*_70ms)] fill-mode-backwards";

/** Greys from the theme, light to dark. */
const AVATAR_TONES = [
  "var(--color-foreground)",
  "var(--color-primary)",
  "var(--color-muted-foreground)",
  "var(--color-ring)",
  "var(--color-secondary)",
];

/** The live count, the capacity as tick marks, and who is going. */
function Capacity({
  event,
  active,
  serifClass,
  closes,
}: {
  event: PublicEvent;
  active: boolean;
  serifClass: string;
  closes: string;
}) {
  const count = useCountUp(event.attendeeCount, active);
  const { capacity, recentAttendees } = event;
  const ticks = capacity === null ? 0 : Math.min(capacity, 40);
  const filled = capacity ? Math.round((Math.min(event.attendeeCount, capacity) / capacity) * ticks) : 0;
  const others = event.attendeeCount - recentAttendees.length;

  return (
    <div className="grid min-w-0 gap-2.5 max-sm:gap-2">
      <p className="flex items-baseline gap-2 max-sm:whitespace-nowrap">
        <span
          aria-hidden
          className={cx(
            "text-[clamp(36px,5cqi,64px)] leading-[0.85] tracking-[-0.04em] text-foreground tabular-nums",
            serifClass,
          )}
        >
          {count}
        </span>
        <span aria-hidden className={cx(mono, "text-muted-foreground")}>
          {capacity === null ? "going" : `/ ${capacity} going`}
        </span>
        <span className="sr-only" aria-live="polite">
          {capacity === null
            ? `${event.attendeeCount} going`
            : `${event.attendeeCount} of ${capacity} spots taken`}
        </span>
      </p>
      {ticks > 0 && (
        <span
          aria-hidden
          style={{ "--n": ticks } as CSSProperties}
          className="grid h-3 w-full grid-cols-[repeat(var(--n),1fr)] items-end"
        >
          {Array.from({ length: ticks }, (_, index) => (
            <i
              key={index}
              data-on={index < filled || undefined}
              style={{ "--i": index } as CSSProperties}
              className="h-[55%] w-px origin-bottom bg-foreground/20 nth-[5n+1]:h-full data-on:bg-foreground motion-safe:group-data-revealed/scene:animate-in zoom-in-0 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] delay-[calc(var(--i)_*_18ms)] fill-mode-backwards"
            />
          ))}
        </span>
      )}
      <p className={cx(mono, "flex flex-col text-muted-foreground")}>
        <span className="text-foreground">{spotsLong(event)}</span>
        {event.status !== "closed" && <span>{closes}</span>}
      </p>
      {recentAttendees.length > 0 && (
        <ul aria-hidden className="mt-0.5 flex sm:@max-[760px]:hidden">
          {recentAttendees.map((attendee, index) => (
            <li
              key={attendee.id}
              title={attendee.name}
              className={cx(
                avatarClass,
                "-ml-[5px] w-[30px] bg-(--tone) text-(--on) ring-2 ring-card first:ml-0 max-sm:w-7",
              )}
              style={
                {
                  "--i": index,
                  "--tone": AVATAR_TONES[index % AVATAR_TONES.length],
                  "--on": index < 3 ? "var(--color-background)" : "var(--color-foreground)",
                } as CSSProperties
              }
            >
              {initials(attendee.name)}
            </li>
          ))}
          {others > 0 && (
            <li
              style={{ "--i": recentAttendees.length } as CSSProperties}
              className={cx(
                avatarClass,
                "ml-1 px-[9px] text-muted-foreground inset-ring inset-ring-foreground/20",
              )}
            >
              +{others}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/** Counts up to `target` once `active`, then follows live changes. */
function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(target);
  const from = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = started.current ? from.current : 0;
    started.current = true;
    const t0 = performance.now();
    const duration = start === 0 ? 1200 : 500;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(start + (target - start) * eased);
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, target]);

  return value;
}

/** Below the card: calendar, share, copy. */
function Actions({ event, url }: { event: PublicEvent; url: string }) {
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (message: string) => {
    setStatus(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus(""), 1800);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <nav
      aria-label="Event actions"
      className={cx(
        monoFace,
        "flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[11px] leading-[1.45] text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-800 motion-safe:delay-1000 motion-safe:fill-mode-backwards max-sm:gap-x-3 max-sm:gap-y-0.5 max-sm:text-[10.5px]",
      )}
    >
      <button type="button" className={actionClass} onClick={() => downloadIcs(event)}>
        Add to calendar
      </button>
      <span aria-hidden>/</span>
      <button
        type="button"
        className={actionClass}
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title: event.title, url });
            } catch {
              /* dismissed */
            }
          } else {
            await copy();
          }
        }}
      >
        Share link
      </button>
      <span aria-hidden>/</span>
      <button type="button" className={actionClass} onClick={copy}>
        {status || "Copy link"}
      </button>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </nav>
  );
}

/** Text link with an underline that draws in on hover. */
const actionClass =
  "relative min-h-8 cursor-pointer uppercase text-muted-foreground transition-colors duration-200 hover:text-foreground after:absolute after:inset-x-0 after:bottom-[7px] after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-[scale] after:duration-350 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:origin-left hover:after:scale-x-100";

function spotsLong(event: PublicEvent) {
  if (event.status === "closed") return "Registration closed";
  if (event.status === "waitlist") return `Full · ${event.capacity} spots, waitlist open`;
  if (event.spotsLeft === null || event.capacity === null) return "Open attendance";
  return `${event.spotsLeft} of ${event.capacity} left`;
}

/**
 * Display size, in container units, so the name fills the card width:
 * the longest line it will balance into, at Geist Serif's ~0.46em average
 * glyph width. Landscape balances into fewer lines than portrait.
 */
function titleFit(title: string) {
  const length = title.trim().length;
  const longest = Math.max(...title.trim().split(/\s+/).map((word) => word.length));
  const size = (lines: number, cap: number) => {
    const perLine = Math.max(longest, Math.ceil(length / lines));
    return Math.min(cap, 100 / (perLine * 0.42)).toFixed(2);
  };
  return {
    landscape: size(length <= 12 ? 1 : length <= 30 ? 2 : 3, 22),
    portrait: size(length <= 8 ? 1 : length <= 14 ? 2 : length <= 32 ? 3 : 4, 30),
  };
}
