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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@meeteora/ui/components/field';
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

const MAX_CAPACITY = 1000;

const resourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name.')
    .max(80, 'Name must be at most 80 characters.'),
  capacity: z
    .number({ invalid_type_error: 'Enter a number.' })
    .int('Use a whole number.')
    .min(1, 'Capacity must be at least 1.')
    .max(MAX_CAPACITY, `Capacity must be at most ${MAX_CAPACITY}.`),
});

type ResourceValues = z.infer<typeof resourceSchema>;

const emptyResource: ResourceValues = { name: '', capacity: 1 };

function ResourceDialog({
  trigger,
  title,
  description,
  submitLabel,
  defaultValues = emptyResource,
  pending,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  submitLabel: string;
  defaultValues?: ResourceValues;
  pending: boolean;
  onSubmit: (values: ResourceValues) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const capacityId = useId();

  const form = useForm({
    defaultValues,
    validators: { onSubmit: resourceSchema },
    onSubmit: async ({ value }) => {
      await onSubmit(resourceSchema.parse(value)).then(
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
        if (next) form.reset(defaultValues);
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
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="gap-2">
                    <FieldLabel htmlFor={nameId}>Name</FieldLabel>
                    <Input
                      id={nameId}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={isInvalid}
                      placeholder="e.g. Anna or Room 2"
                      autoFocus
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="capacity"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="gap-2">
                    <FieldLabel htmlFor={capacityId}>Capacity</FieldLabel>
                    <Input
                      id={capacityId}
                      name={field.name}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_CAPACITY}
                      step={1}
                      value={
                        Number.isNaN(field.state.value) ? '' : field.state.value
                      }
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.valueAsNumber)
                      }
                      aria-invalid={isInvalid}
                      className="w-28 tabular-nums"
                    />
                    <FieldDescription>
                      How many bookings may overlap on this resource at once.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
          </FieldGroup>
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
    <ResourceDialog
      trigger={<Button>Add resource</Button>}
      title="Add resource"
      description="A host or room that bookings can be held by. It's offered right away, Monday to Friday, 9:00 to 17:00. Change that with Hours in its row."
      submitLabel="Add resource"
      pending={create.isPending}
      onSubmit={(values) => create.mutateAsync(values)}
    />
  );
}

export function EditResourceDialog({ resource }: { resource: Resource }) {
  const trpc = useTRPC();
  const update = useMutation(
    trpc.resources.update.mutationOptions(useResourceMutationCallbacks()),
  );
  return (
    <ResourceDialog
      trigger={
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      }
      title={`Edit ${resource.name}`}
      description="Existing bookings keep their host. A lower capacity only affects new bookings."
      submitLabel="Save"
      defaultValues={{ name: resource.name, capacity: resource.capacity }}
      pending={update.isPending}
      onSubmit={(values) => update.mutateAsync({ id: resource.id, ...values })}
    />
  );
}
