"use client";

import type { Resource } from "@meeteora/contracts";
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
import { Input } from "@meeteora/ui/components/input";
import { Label } from "@meeteora/ui/components/label";
import { toast } from "@meeteora/ui/components/sonner";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type ReactElement, useId, useState } from "react";
import { formText } from "@/lib/form-data";
import { useTRPC } from "@/trpc/provider";

/** Refreshes the page's server data on success and toasts on failure. */
export function useResourceMutationCallbacks() {
  const router = useRouter();
  return {
    onSuccess: () => router.refresh(),
    onError: (error: { message: string }) =>
      toast.error(error.message || "Something went wrong. Try again."),
  };
}

function NameDialog({
  trigger,
  title,
  description,
  submitLabel,
  defaultName,
  pending,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  submitLabel: string;
  defaultName?: string;
  pending: boolean;
  /** Resolves when saved; the dialog then closes. */
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const inputId = useId();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            const name = formText(new FormData(event.currentTarget), "name");
            onSubmit(name).then(() => setOpen(false), () => {});
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={inputId}>Name</Label>
            <Input
              id={inputId}
              name="name"
              required
              maxLength={80}
              defaultValue={defaultName}
              placeholder="e.g. Anna or Room 2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The page's main action: a button that opens the new-resource dialog. */
export function AddResourceDialog() {
  const trpc = useTRPC();
  const create = useMutation(
    trpc.resources.create.mutationOptions(useResourceMutationCallbacks()),
  );
  return (
    <NameDialog
      trigger={<Button>Add resource</Button>}
      title="Add resource"
      description="A host or room that bookings can be held by. It's offered right away, Monday to Friday, 9:00 to 17:00."
      submitLabel="Add resource"
      pending={create.isPending}
      onSubmit={(name) => create.mutateAsync({ name })}
    />
  );
}

export function RenameResourceDialog({ resource }: { resource: Resource }) {
  const trpc = useTRPC();
  const rename = useMutation(
    trpc.resources.rename.mutationOptions(useResourceMutationCallbacks()),
  );
  return (
    <NameDialog
      trigger={
        <Button variant="ghost" size="sm">
          Rename
        </Button>
      }
      title={`Rename ${resource.name}`}
      description="Existing bookings keep their host; only the name changes."
      submitLabel="Save"
      defaultName={resource.name}
      pending={rename.isPending}
      onSubmit={(name) => rename.mutateAsync({ id: resource.id, name })}
    />
  );
}
