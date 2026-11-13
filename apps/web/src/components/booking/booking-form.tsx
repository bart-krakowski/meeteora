"use client";

import { Button } from "@meeteora/ui/components/button";
import { Input } from "@meeteora/ui/components/input";
import { cn } from "@meeteora/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dayKey, formatDayHeading, formatTime } from "@/lib/format";
import { useTRPC } from "@/trpc/provider";
import { formText } from "@/lib/form-data";

export interface BookableSlot {
  start: string;
  end: string;
}

export function BookingForm({
  slug,
  ruleId,
  slots,
}: {
  slug: string;
  ruleId: string;
  slots: Array<BookableSlot>;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const book = useMutation(
    trpc.bookings.create.mutationOptions({
      onSuccess: () => router.push(`/book/${slug}?booked=1`),
    }),
  );

  const groups = new Map<string, Array<BookableSlot>>();
  for (const slot of slots) {
    const key = dayKey(slot.start);
    const group = groups.get(key);
    if (group) group.push(slot);
    else groups.set(key, [slot]);
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selected) return;
        const data = new FormData(event.currentTarget);
        book.mutate({
          ruleId,
          start: selected,
          attendee: {
            name: formText(data, "name"),
            email: formText(data, "email"),
          },
        });
      }}
    >
      <div className="flex flex-col gap-5">
        {[...groups.entries()].map(([day, daySlots]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              {formatDayHeading(daySlots[0].start)}
            </h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {daySlots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  onClick={() => setSelected(slot.start)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors hover:border-foreground/50",
                    selected === slot.start
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card",
                  )}
                >
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t pt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" name="name" autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
        </div>
        {book.isError && (
          <p className="text-sm text-destructive">
            {book.error.data?.code === "CONFLICT"
              ? "That slot was just taken. Pick another time."
              : book.error.message}
          </p>
        )}
        <Button type="submit" disabled={!selected || book.isPending}>
          {book.isPending ? "Booking…" : "Book"}
        </Button>
      </div>
    </form>
  );
}
