import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { formatDotDate, formatEventDate, formatEventTime } from "@/lib/events/format";
import { getPublicEvent } from "@/lib/events/store";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Event card";

const FONTS = join(process.cwd(), "src/app/e/[slug]/fonts");

/** The shared link previews as the card front: name, date, place, host. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getPublicEvent(slug);
  const [serif, mono] = await Promise.all([
    readFile(join(FONTS, "GeistSerif-Regular.ttf")),
    readFile(join(FONTS, "GeistMono-Regular.ttf")),
  ]);

  const title = event?.title ?? "Event not found";
  const titleSize = Math.min(150, Math.round(1500 / Math.max(11, Math.ceil(title.length / 2))));
  const mono12 = { fontFamily: "Geist Mono", fontSize: 17, letterSpacing: 1, color: "#8a8a8a" };

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0a", padding: 44 }}>
      <div
        style={{
          display: "flex",
          flex: 1,
          background: "#111",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 40 }}>
          <div style={{ display: "flex", gap: 28, ...mono12 }}>
            <span style={{ color: "#ededed" }}>01</span>
            <span>{event?.category.toUpperCase()}</span>
          </div>
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "flex-end",
              fontFamily: "Geist Serif",
              fontSize: titleSize,
              lineHeight: 0.9,
              letterSpacing: -titleSize * 0.045,
              color: "#ededed",
              paddingBottom: 28,
            }}
          >
            {title}
          </div>
          {event && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                paddingTop: 18,
                ...mono12,
              }}
            >
              <span style={{ color: "#ededed" }}>
                {`${formatEventDate(event)} · ${formatEventTime(event)}`.toUpperCase()}
              </span>
              <span>{`${event.location.venue}, ${event.location.city}`.toUpperCase()}</span>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            width: 200,
            padding: "40px 0",
            borderLeft: "1px dashed rgba(255,255,255,0.18)",
            ...mono12,
          }}
        >
          <span style={{ color: "#ededed" }}>
            {event ? formatDotDate(event.startsAt, event.timeZone) : ""}
          </span>
          <span style={{ fontFamily: "Geist Serif", fontSize: 40, color: "#ededed", letterSpacing: -1 }}>
            Admit one
          </span>
          <span>{event?.organizer.name.toUpperCase()}</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Geist Serif", data: serif, weight: 400, style: "normal" },
        { name: "Geist Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
