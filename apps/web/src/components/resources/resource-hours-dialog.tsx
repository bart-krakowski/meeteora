"use client";

import type { Resource, ResourceHours } from "@meeteora/contracts";
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
import { toast } from "@meeteora/ui/components/sonner";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/trpc/provider";
import { DaysOffEditor, rangeErrors, WeeklyHoursEditor } from "./hours-editor";

function hoursOf({ weekly, daysOff }: ResourceHours): ResourceHours {
  return { weekly, daysOff };
}

/** Edits one resource's weekly hours and days off. */
export function ResourceHoursDialog({ resource }: { resource: Resource }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const {
    data: { timeZone },
  } = useSuspenseQuery(trpc.bookingRules.get.queryOptions());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ResourceHours>(() => hoursOf(resource));

  const save = useMutation(
    trpc.resources.updateHours.mutationOptions({
      onSuccess: () => {
        setOpen(false);
        toast.success(`${resource.name}'s hours saved`);
        void queryClient.invalidateQueries({
          queryKey: trpc.resources.list.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: trpc.slots.list.queryKey(),
        });
      },
      onError: (error) =>
        toast.error(error.message || "Couldn't save. Try again."),
    }),
  );

  const isValid = Object.keys(rangeErrors(draft.weekly)).length === 0;
  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(hoursOf(resource));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(hoursOf(resource));
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            Hours
          </Button>
        }
      />
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid && isDirty) {
              save.mutate({ id: resource.id, ...draft });
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{resource.name}'s hours</DialogTitle>
            <DialogDescription>
              When {resource.name} can be booked. Times are in {timeZone}.
              Existing bookings stay; changes only affect new bookings and
              moves.
            </DialogDescription>
          </DialogHeader>

          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-sm font-medium">Weekly hours</h3>
            <WeeklyHoursEditor
              value={draft.weekly}
              onChange={(weekly) => setDraft((prev) => ({ ...prev, weekly }))}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="font-heading text-sm font-medium">Days off</h3>
              <p className="text-sm text-muted-foreground">
                Whole days closed, e.g. holidays or leave.
              </p>
            </div>
            <DaysOffEditor
              value={draft.daysOff}
              timeZone={timeZone}
              onChange={(daysOff) => setDraft((prev) => ({ ...prev, daysOff }))}
            />
          </section>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={!isDirty || !isValid || save.isPending}
            >
              {save.isPending ? "Saving…" : "Save hours"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
