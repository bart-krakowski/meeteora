'use client';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@meeteora/ui/components/dialog';
import { useMutation } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { GeistSerif } from 'geist/font/serif';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import * as z from 'zod';
import {
  formatEventDate,
  formatEventTime,
  formatPrice,
  toIcs,
} from '@/lib/events/format';
import type { PublicEvent, RegistrationOutcome } from '@/lib/events/types';
import { useTRPC } from '@/trpc/provider';
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
} from '@meeteora/ui/components/icons';

const registrationSchema = z.object({
  name: z.string().min(1, 'Enter your name.').max(80, 'Name is too long.'),
  email: z.string().email('Enter a valid email address.'),
});

interface Saved {
  name: string;
  email: string;
  outcome: RegistrationOutcome;
}

const storageKey = (slug: string) => `invite:${slug}`;

function readSaved(slug: string): Saved | null {
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const saved: Saved = JSON.parse(raw);
    return saved;
  } catch {
    return null;
  }
}

/**
 * The one action: the Register button and its modal. Registration is
 * remembered on this device and read after hydration.
 */
export function Registration({
  event,
  className = '',
}: {
  event: PublicEvent;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);

  useEffect(() => setSaved(readSaved(event.slug)), [event.slug]);

  const closed = event.status === 'closed';
  const label = saved
    ? saved.outcome === 'waitlisted'
      ? "You're on the waitlist"
      : "You're going"
    : closed
      ? 'Registration closed'
      : event.status === 'waitlist'
        ? 'Join waitlist'
        : 'Register';

  return (
    <>
      <button
        type="button"
        disabled={closed && !saved}
        onClick={() => setOpen(true)}
        data-variant={saved ? 'secondary' : 'primary'}
        className={`${buttonClass} ${className}`}
      >
        {saved && <CheckIcon size={15} aria-hidden />}
        {label}
        {!saved && !closed && (
          <ArrowRightIcon
            size={15}
            aria-hidden
            className="transition-[translate] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-[3px]"
          />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden rounded-[10px] bg-popover p-0 text-popover-foreground shadow-[0_32px_80px_-24px_rgba(0,0,0,0.5)] ring-1 ring-foreground/10 sm:max-w-[440px] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]"
        >
          <DialogClose
            aria-label="Close"
            className="absolute top-4 right-4 grid size-8 place-items-center rounded-[6px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
          >
            <CloseIcon size={16} />
          </DialogClose>
          {saved ? (
            <Confirmation event={event} saved={saved} />
          ) : (
            <RegistrationForm
              event={event}
              onDone={(next) => {
                window.localStorage.setItem(
                  storageKey(event.slug),
                  JSON.stringify(next),
                );
                setSaved(next);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Primary: solid off-white. Secondary (already registered): hairline. */
const buttonClass = [
  'group inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2.5 rounded-[8px] border border-transparent px-[18px] font-sans text-[14.5px] font-medium tracking-[-0.005em] whitespace-nowrap',
  'transition-[background-color,border-color,translate,scale,box-shadow] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] @max-[760px]:px-3',
  'data-[variant=primary]:enabled:bg-foreground data-[variant=primary]:enabled:text-background',
  'data-[variant=primary]:enabled:hover:-translate-y-px data-[variant=primary]:enabled:hover:bg-foreground/90 data-[variant=primary]:enabled:hover:shadow-[0_10px_24px_-12px] shadow-foreground/35',
  'data-[variant=secondary]:border-foreground/20 data-[variant=secondary]:text-foreground data-[variant=secondary]:hover:border-foreground/50',
  'enabled:active:translate-y-0 enabled:active:scale-[0.98]',
  'disabled:cursor-not-allowed disabled:border-border disabled:text-muted-foreground',
].join(' ');

const inputClass =
  'h-11 w-full rounded-[6px] border border-foreground/15 bg-transparent px-3 text-[15px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-foreground/30 focus:border-foreground focus:ring-3 focus:ring-foreground/10 aria-invalid:border-foreground';

/** Per-field error, styled like the dialog's form-level error. */
function FieldErrorText({
  id,
  errors,
}: {
  id: string;
  errors: Array<{ message?: string } | undefined>;
}) {
  const message = errors.find((error) => error?.message)?.message;
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-foreground">
      <span
        aria-hidden
        className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-foreground"
      />
      {message}
    </p>
  );
}

function RegistrationForm({
  event,
  onDone,
}: {
  event: PublicEvent;
  onDone: (saved: Saved) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const id = useId();
  const waitlist = event.status === 'waitlist';
  const register = useMutation(
    trpc.publicEvents.register.mutationOptions({
      onSuccess: (result, input) => {
        onDone({
          name: input.name,
          email: input.email,
          outcome: result.outcome,
        });
        router.refresh();
      },
    }),
  );

  const error = register.error
    ? register.error.data?.code === 'BAD_REQUEST'
      ? 'Check your name and email address.'
      : register.error.message
    : null;

  const form = useForm({
    defaultValues: { name: '', email: '' },
    validators: { onSubmit: registrationSchema },
    onSubmit: async ({ value }) => {
      register.mutate({
        slug: event.slug,
        name: value.name,
        email: value.email,
      });
    },
  });

  return (
    <form
      onSubmit={(formEvent) => {
        formEvent.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="px-6 pt-6 pb-5 sm:px-7 sm:pt-7">
        <p className="text-[12px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {waitlist ? 'Join the waitlist' : 'Registration'}
        </p>
        <DialogTitle
          className={`${GeistSerif.className} mt-2 pr-8 text-[30px] leading-[1.05] font-normal tracking-[-0.02em]`}
        >
          {event.title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-[14px] leading-[1.5] text-muted-foreground">
          {formatEventDate(event)} · {formatEventTime(event)}
        </DialogDescription>
      </div>

      <div className="flex flex-col gap-4 border-t border-foreground/10 px-6 pt-5 pb-6 sm:px-7 sm:pb-7">
        <form.Field
          name="name"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <label className="flex flex-col gap-1.5" htmlFor={`${id}-name`}>
                <span className="text-[13px] font-medium">Name</span>
                <input
                  id={`${id}-name`}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(changeEvent) =>
                    field.handleChange(changeEvent.target.value)
                  }
                  autoComplete="name"
                  autoFocus
                  placeholder="Your full name"
                  aria-invalid={isInvalid || undefined}
                  aria-describedby={isInvalid ? `${id}-name-error` : undefined}
                  className={inputClass}
                />
                {isInvalid && (
                  <FieldErrorText
                    id={`${id}-name-error`}
                    errors={field.state.meta.errors}
                  />
                )}
              </label>
            );
          }}
        />
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <label className="flex flex-col gap-1.5" htmlFor={`${id}-email`}>
                <span className="text-[13px] font-medium">Email</span>
                <input
                  id={`${id}-email`}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(changeEvent) =>
                    field.handleChange(changeEvent.target.value)
                  }
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@studio.com"
                  aria-invalid={isInvalid || register.error ? true : undefined}
                  aria-describedby={
                    isInvalid
                      ? `${id}-email-error`
                      : error
                        ? `${id}-error`
                        : undefined
                  }
                  className={inputClass}
                />
                {isInvalid && (
                  <FieldErrorText
                    id={`${id}-email-error`}
                    errors={field.state.meta.errors}
                  />
                )}
              </label>
            );
          }}
        />

        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-[13px] text-foreground"
          >
            <span
              aria-hidden
              className="mr-1.5 inline-block size-1.5 -translate-y-px rounded-full bg-foreground"
            />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={register.isPending}
          className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] bg-foreground text-[15px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.99] disabled:cursor-progress disabled:bg-foreground/70"
        >
          {register.isPending
            ? 'Registering…'
            : waitlist
              ? 'Join waitlist'
              : 'Confirm registration'}
        </button>
        <p className="text-[12px] leading-[1.5] text-muted-foreground">
          {formatPrice(event.price)}
          {event.price?.note ? `. ${event.price.note}` : ''} Your email is
          shared only with {event.organizer.name}.
        </p>
      </div>
    </form>
  );
}

function Confirmation({ event, saved }: { event: PublicEvent; saved: Saved }) {
  const waitlisted = saved.outcome === 'waitlisted';
  const firstName = saved.name.split(/\s+/)[0];

  return (
    <div className="px-6 pt-8 pb-6 sm:px-7 sm:pt-9 sm:pb-7">
      <span className="grid size-11 place-items-center rounded-full border border-foreground">
        <CheckIcon size={20} aria-hidden />
      </span>
      <DialogTitle
        className={`${GeistSerif.className} mt-6 text-[34px] leading-[1.02] font-normal tracking-[-0.02em]`}
      >
        {waitlisted
          ? `You're on the waitlist, ${firstName}.`
          : `You're in, ${firstName}.`}
      </DialogTitle>
      <DialogDescription className="mt-3 text-[15px] leading-[1.55] text-muted-foreground">
        {waitlisted
          ? `We'll email ${saved.email} if a spot opens for ${event.title}.`
          : `${event.title} · ${formatEventDate(event)}, ${formatEventTime(event)}. Details go to ${saved.email}.`}
      </DialogDescription>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        {!waitlisted && (
          <button
            type="button"
            onClick={() => downloadIcs(event)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[6px] border border-foreground/15 text-[14px] font-medium transition-[border-color,background-color,transform] hover:border-foreground/35 hover:bg-muted active:scale-[0.98]"
          >
            Add to calendar
          </button>
        )}
        <DialogClose className="inline-flex h-11 flex-1 items-center justify-center rounded-[6px] bg-foreground text-[14px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.98]">
          Done
        </DialogClose>
      </div>
    </div>
  );
}

/** Downloads the event as an .ics file. */
export function downloadIcs(event: PublicEvent) {
  const blob = new Blob([toIcs(event, window.location.href)], {
    type: 'text/calendar',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${event.slug}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
}
