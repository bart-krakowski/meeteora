"use client";

import type { BookingRulesSettings } from "@meeteora/contracts";
import { Button } from "@meeteora/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@meeteora/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@meeteora/ui/components/field";
import { Input } from "@meeteora/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@meeteora/ui/components/select";
import { toast } from "@meeteora/ui/components/sonner";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTRPC } from "@/trpc/provider";

const STEP_OPTIONS = [
  { value: "event", label: "Every event length" },
  { value: "15", label: "Every 15 min" },
  { value: "30", label: "Every 30 min" },
  { value: "60", label: "Every hour" },
];

const LIMITS = {
  minNoticeMinutes: { min: 0, max: 43_200 },
  bufferAfterMinutes: { min: 0, max: 240 },
  maxHorizonDays: { min: 1, max: 365 },
} as const;

function inRange(value: number, { min, max }: { min: number; max: number }) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function NumberField({
  label,
  description,
  unit,
  value,
  limits,
  onChange,
}: {
  label: string;
  description: string;
  unit: string;
  value: number;
  limits: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  const id = useId();
  const invalid = !inRange(value, limits);
  return (
    <Field data-invalid={invalid} className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={limits.min}
          max={limits.max}
          step={1}
          value={Number.isNaN(value) ? "" : value}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          aria-invalid={invalid}
          className="w-28 tabular-nums"
        />
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
      <FieldDescription>
        {invalid
          ? `Enter a whole number from ${limits.min} to ${limits.max}.`
          : description}
      </FieldDescription>
    </Field>
  );
}

function settingsOf({
  slotStepMinutes,
  minNoticeMinutes,
  bufferAfterMinutes,
  maxHorizonDays,
}: BookingRulesSettings): BookingRulesSettings {
  return { slotStepMinutes, minNoticeMinutes, bufferAfterMinutes, maxHorizonDays };
}

/** Slot rules shared by every resource and event type. */
export function BookingRulesDialog() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: saved } = useSuspenseQuery(
    trpc.bookingRules.get.queryOptions(),
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BookingRulesSettings>(() =>
    settingsOf(saved),
  );
  const stepId = useId();

  const save = useMutation(
    trpc.bookingRules.update.mutationOptions({
      onSuccess: (next) => {
        queryClient.setQueryData(trpc.bookingRules.get.queryKey(), next);
        void queryClient.invalidateQueries({
          queryKey: trpc.slots.list.queryKey(),
        });
        setOpen(false);
        toast.success("Booking rules saved");
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't save. Try again."),
    }),
  );

  const isValid =
    inRange(draft.minNoticeMinutes, LIMITS.minNoticeMinutes) &&
    inRange(draft.bufferAfterMinutes, LIMITS.bufferAfterMinutes) &&
    inRange(draft.maxHorizonDays, LIMITS.maxHorizonDays);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(settingsOf(saved));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(settingsOf(saved));
      }}
    >
      <DialogTrigger render={<Button variant="outline">Booking rules</Button>} />
      <DialogContent className="sm:max-w-2xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid && isDirty) save.mutate(draft);
          }}
        >
          <DialogHeader>
            <DialogTitle>Booking rules</DialogTitle>
            <DialogDescription>
              Apply to every resource and event type. Changes affect new
              bookings and moves, not bookings already made.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-6 sm:grid-cols-2">
            <Field className="gap-2">
              <FieldLabel htmlFor={stepId}>Slot start times</FieldLabel>
              <Select
                items={STEP_OPTIONS}
                value={
                  draft.slotStepMinutes === null
                    ? "event"
                    : String(draft.slotStepMinutes)
                }
                onValueChange={(value) =>
                  setDraft((prev) => ({
                    ...prev,
                    slotStepMinutes:
                      value === "event" || value === null
                        ? null
                        : Number(value),
                  }))
                }
              >
                <SelectTrigger id={stepId} className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                How often a slot can start, counted from each opening time.
                Calendar drags snap to 15 min, so 15 lets any drop land on a
                slot.
              </FieldDescription>
            </Field>
            <NumberField
              label="Minimum notice"
              description="How long before its start a booking must be made or moved to."
              unit="minutes"
              value={draft.minNoticeMinutes}
              limits={LIMITS.minNoticeMinutes}
              onChange={(minNoticeMinutes) =>
                setDraft((prev) => ({ ...prev, minNoticeMinutes }))
              }
            />
            <NumberField
              label="Buffer after bookings"
              description="Kept free after each booking before the host's next one."
              unit="minutes"
              value={draft.bufferAfterMinutes}
              limits={LIMITS.bufferAfterMinutes}
              onChange={(bufferAfterMinutes) =>
                setDraft((prev) => ({ ...prev, bufferAfterMinutes }))
              }
            />
            <NumberField
              label="Booking window"
              description="How far ahead slots are offered."
              unit="days"
              value={draft.maxHorizonDays}
              limits={LIMITS.maxHorizonDays}
              onChange={(maxHorizonDays) =>
                setDraft((prev) => ({ ...prev, maxHorizonDays }))
              }
            />
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={!isDirty || !isValid || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save rules"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
