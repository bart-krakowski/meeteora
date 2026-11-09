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
    <section className="ec-stage" aria-labelledby="event-title">
      <div className="ec-wrap wrap">
        <div
          className="ec-scene"
          data-revealed={revealed || undefined}
          style={{ "--fit-l": fit.landscape, "--fit-p": fit.portrait } as CSSProperties}
        >
          <div className="ec-tilt">
            <div aria-hidden className="ec-shadow" />
            <div className="ec-face">
              <div className="ec-body">
                <Crops />
                <div className="ec-top">
                  <p className="ec-mono ec-tags">
                    <span className="ec-ink">01</span>
                    <span>{event.category}</span>
                    <span className="ec-hide-narrow">{text.year}</span>
                  </p>
                  <p className="ec-host">
                    <span className="ec-host-name">{text.host}</span>
                    {text.hostRole && <span className="ec-mono">{text.hostRole}</span>}
                  </p>
                </div>

                <div className="ec-display">
                  <span aria-hidden className="ec-guide ec-guide-h ec-guide-top">
                    <span className="ec-mono">Geist Serif</span>
                  </span>
                  <span aria-hidden className="ec-guide ec-guide-h ec-guide-base">
                    <span className="ec-mono">Baseline</span>
                  </span>
                  <h1 id="event-title" className={`ec-title ${serifClass}`}>
                    {words.map((word, index) => (
                      <Fragment key={`${word}-${index}`}>
                        {index > 0 && " "}
                        <span className="ec-word" style={{ "--i": index } as CSSProperties}>
                          <span>{word}</span>
                        </span>
                      </Fragment>
                    ))}
                  </h1>
                </div>

                <dl className="ec-rows">
                  <Row label="When" value={text.shortDate} detail={`${text.time} · ${text.duration}`} />
                  <Row label="Where" value={event.location.venue} detail={text.address} />
                  <Row label="Price" value={text.price} detail={event.price?.note ?? null} />
                </dl>
              </div>

              <div className="ec-stub">
                <span aria-hidden className="ec-perf" />
                <p className="ec-stub-head">
                  <span className="ec-mono ec-ink">{text.dotDate}</span>
                  <span aria-hidden className={`ec-admit ${serifClass}`}>
                    Admit one
                  </span>
                </p>

                <Capacity event={event} active={revealed} serifClass={serifClass} closes={text.closes} />

                <div className="ec-link">
                  <svg
                    className="ec-qr"
                    viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
                    role="img"
                    aria-label={`QR code for ${text.shortUrl}`}
                    shapeRendering="crispEdges"
                  >
                    <rect x="-2" y="-2" width={qr.size + 4} height={qr.size + 4} rx="1.2" />
                    <path d={qr.d} />
                  </svg>
                  <p className="ec-mono">
                    <span className="ec-ink">Event link</span>
                    <span className="ec-url">{text.shortUrl}</span>
                  </p>
                </div>

                <Registration event={event} className="ec-register" />
              </div>
            </div>
          </div>
        </div>

        <Actions event={event} url={url} />
      </div>
    </section>
  );
}

function Crops() {
  return (
    <>
      <span aria-hidden className="ec-crop ec-crop-tl" />
      <span aria-hidden className="ec-crop ec-crop-tr" />
      <span aria-hidden className="ec-crop ec-crop-bl" />
      <span aria-hidden className="ec-crop ec-crop-br" />
    </>
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
    <div className="ec-row">
      <dt className="ec-mono">{label}</dt>
      <dd>
        <span className="ec-row-value">{value}</span>
        {detail && <span className="ec-row-detail">{detail}</span>}
      </dd>
    </div>
  );
}

const AVATAR_TONES = ["#ededed", "#bdbdbd", "#8f8f8f", "#5e5e5e", "#3a3a3a"];

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
    <div className="ec-capacity">
      <p className="ec-count">
        <span className={`ec-count-num ${serifClass}`} aria-hidden>
          {count}
        </span>
        <span className="ec-mono ec-count-of" aria-hidden>
          {capacity === null ? "going" : `/ ${capacity} going`}
        </span>
        <span className="sr-only" aria-live="polite">
          {capacity === null
            ? `${event.attendeeCount} going`
            : `${event.attendeeCount} of ${capacity} spots taken`}
        </span>
      </p>
      {ticks > 0 && (
        <span aria-hidden className="ec-ticks" style={{ "--n": ticks } as CSSProperties}>
          {Array.from({ length: ticks }, (_, index) => (
            <i
              key={index}
              data-on={index < filled || undefined}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </span>
      )}
      <p className="ec-mono ec-spots">
        <span className="ec-ink">{spotsLong(event)}</span>
        {event.status !== "closed" && <span>{closes}</span>}
      </p>
      {recentAttendees.length > 0 && (
        <ul aria-hidden className="ec-avatars">
          {recentAttendees.map((attendee, index) => (
            <li
              key={attendee.id}
              title={attendee.name}
              style={
                {
                  "--i": index,
                  "--tone": AVATAR_TONES[index % AVATAR_TONES.length],
                  "--on": index < 3 ? "#0a0a0a" : "#ededed",
                } as CSSProperties
              }
            >
              {initials(attendee.name)}
            </li>
          ))}
          {others > 0 && (
            <li className="ec-avatar-more" style={{ "--i": recentAttendees.length } as CSSProperties}>
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
    <nav aria-label="Event actions" className="ec-actions ec-mono">
      <button type="button" onClick={() => downloadIcs(event)}>
        Add to calendar
      </button>
      <span aria-hidden>/</span>
      <button
        type="button"
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
      <button type="button" onClick={copy}>
        {status || "Copy link"}
      </button>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </nav>
  );
}

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
