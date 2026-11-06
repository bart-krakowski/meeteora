import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventInvitation } from "@/components/invite/event-invitation";
import { formatEventDate } from "@/lib/events/format";
import { getPublicEvent } from "@/lib/events/store";

export async function generateMetadata({
  params,
}: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = getPublicEvent(slug);
  if (!event) return { title: "Event not found" };
  const description = `${formatEventDate(event)} · ${event.location.venue}, ${event.location.city}. ${event.description}`;
  return {
    title: `${event.title} · ${event.organizer.name}`,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.cover ? [{ url: event.cover.src, alt: event.cover.alt }] : undefined,
    },
  };
}

export default async function EventPage({ params }: PageProps<"/e/[slug]">) {
  await connection();
  const { slug } = await params;
  const event = getPublicEvent(slug);
  if (!event) notFound();
  return <EventInvitation event={event} />;
}
