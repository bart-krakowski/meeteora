import { connection } from "next/server";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/booking-form";
import { Logo } from "@/components/logo";
import { api } from "@/trpc/server";
import { TIME_ZONE } from "@/lib/format";
import { BadgeCheckIcon } from "@meeteora/ui/components/icons";

export default async function BookPage({
  params,
  searchParams,
}: PageProps<"/book/[slug]">) {
  await connection();
  const { slug } = await params;
  const { booked } = await searchParams;

  const eventTypes = await api.eventTypes.list();
  const eventType = eventTypes.find((candidate) => candidate.slug === slug);
  if (!eventType) notFound();

  if (booked === "1") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <BadgeCheckIcon className="size-12 text-primary" />
        <h1 className="text-xl font-semibold">Booking confirmed</h1>
        <p className="text-sm text-muted-foreground">
          You're booked for {eventType.name}. See you soon.
        </p>
      </main>
    );
  }

  const { slots } = await api.slots.list();
  const available = slots
    .filter((slot) => slot.ruleId === eventType.id)
    .map((slot) => ({ start: slot.start, end: slot.end }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <Logo className="size-8" />
        <h1 className="mt-4 text-2xl font-semibold">{eventType.name}</h1>
        <p className="text-sm text-muted-foreground">
          {eventType.durationMinutes} minutes · {TIME_ZONE} time
        </p>
      </header>
      {available.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No available times right now. Check back later.
        </p>
      ) : (
        <BookingForm slug={slug} ruleId={eventType.id} slots={available} />
      )}
    </main>
  );
}
