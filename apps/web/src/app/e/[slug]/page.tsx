import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventInvitation } from "@/components/invite/event-invitation";
import { formatEventDate } from "@/lib/events/format";
import { getPublicEvent } from "@/lib/events/store";

/** The public origin, from the proxy headers when behind one. */
async function origin() {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function generateMetadata({
  params,
}: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = getPublicEvent(slug);
  if (!event) return { title: "Event not found" };
  const base = await origin();
  const description = `${formatEventDate(event)} · ${event.location.venue}, ${event.location.city}. ${event.description}`;
  // The card front is the preview: opengraph-image.tsx beside this file.
  return {
    metadataBase: new URL(base),
    title: `${event.title} · ${event.organizer.name}`,
    description,
    alternates: { canonical: `/e/${slug}` },
    openGraph: {
      type: "website",
      url: `/e/${slug}`,
      title: event.title,
      description,
      siteName: "Meeteora",
    },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  await connection();
  const { slug } = await params;
  const event = getPublicEvent(slug);
  if (!event) notFound();
  return <EventInvitation event={event} url={`${await origin()}/e/${slug}`} />;
}
