'use client';

import { Button } from '@meeteora/ui/components/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@meeteora/ui/components/field';
import { Input } from '@meeteora/ui/components/input';
import { cn } from '@meeteora/ui/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { dayKey, formatDayHeading, formatTime } from '@/lib/format';
import { useTRPC } from '@/trpc/provider';

export interface BookableSlot {
  start: string;
  end: string;
}

const bookingSchema = z.object({
  slot: z.string().min(1, 'Pick a time slot.'),
  name: z.string().min(1, 'Enter your name.').max(80, 'Name is too long.'),
  email: z.string().email('Enter a valid email address.'),
});

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
  const book = useMutation(
    trpc.bookings.create.mutationOptions({
      onSuccess: () => router.push(`/book/${slug}?booked=1`),
    }),
  );

  const form = useForm({
    defaultValues: { slot: '', name: '', email: '' },
    validators: { onSubmit: bookingSchema },
    onSubmit: async ({ value }) => {
      await book.mutateAsync({
        ruleId,
        start: value.slot,
        attendee: { name: value.name, email: value.email },
      });
    },
  });

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
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="slot"
        children={(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid} className="gap-5">
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
                          onClick={() => field.handleChange(slot.start)}
                          aria-pressed={field.state.value === slot.start}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-sm tabular-nums transition-colors hover:border-foreground/50',
                            field.state.value === slot.start
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'bg-card',
                          )}
                        >
                          {formatTime(slot.start)}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      />

      <div className="flex flex-col gap-3 border-t pt-6">
        <FieldGroup className="grid gap-3 sm:grid-cols-2">
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid} className="gap-1.5">
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="name"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <form.Field
            name="email"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid} className="gap-1.5">
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    autoComplete="email"
                    aria-invalid={isInvalid}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </FieldGroup>
        {book.isError && (
          <p role="alert" className="text-sm text-destructive">
            {book.error.data?.code === 'CONFLICT'
              ? 'That slot was just taken. Pick another time.'
              : book.error.message}
          </p>
        )}
        <Button type="submit" disabled={book.isPending}>
          {book.isPending ? 'Booking…' : 'Book'}
        </Button>
      </div>
    </form>
  );
}
