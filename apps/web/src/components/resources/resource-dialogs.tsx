'use client';

import type { Resource } from '@meeteora/contracts';
import { Button } from '@meeteora/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@meeteora/ui/components/dialog';
import { Field, FieldError, FieldLabel } from '@meeteora/ui/components/field';
import { Input } from '@meeteora/ui/components/input';
import { toast } from '@meeteora/ui/components/sonner';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useId, useState } from 'react';
import * as z from 'zod';
import { useTRPC } from '@/trpc/provider';

/** Refetches the resource list on success and toasts on failure. */
export function useResourceMutationCallbacks() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: trpc.resources.list.queryKey(),
      }),
    onError: (error: { message: string }) =>
      toast.error(error.message || 'Something went wrong. Try again.'),
  };
}

const nameSchema = z.object({
  name: z
    .string()
    .min(1, 'Enter a name.')
    .max(80, 'Name must be at most 80 characters.'),
});

function NameDialog({
  trigger,
  title,
  description,
  submitLabel,
  defaultName = '',
  pending,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  submitLabel: string;
  defaultName?: string;
  pending: boolean;
  onSubmit: (name: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const inputId = useId();

  const form = useForm({
    defaultValues: { name: defaultName },
    validators: { onSubmit: nameSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(value.name).then(
        () => setOpen(false),
        () => {},
      );
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset({ name: defaultName });
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form.Field
            name="name"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid} className="gap-2">
                  <FieldLabel htmlFor={inputId}>Name</FieldLabel>
                  <Input
                    id={inputId}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="e.g. Anna or Room 2"
                    autoFocus
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

export function EditResourceDialog({ resource }: { resource: Resource }) {
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
