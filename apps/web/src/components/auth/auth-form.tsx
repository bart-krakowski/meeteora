'use client';

import { Button } from '@meeteora/ui/components/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@meeteora/ui/components/field';
import { Input } from '@meeteora/ui/components/input';
import { useForm } from '@tanstack/react-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import * as z from 'zod';
import { authClient } from '@/lib/auth/client';
import { EyeIcon, EyeOffIcon, GoogleIcon } from '@meeteora/ui/components/icons';

type Mode = 'sign-in' | 'sign-up';
type SocialProvider = 'google';

const COPY = {
  'sign-in': {
    title: 'Welcome back',
    subtitle: 'Sign in to manage your bookings and events.',
    socialVerb: 'Sign in',
    pending: 'Signing in…',
    switchLabel: 'Create account',
    switchHref: '/sign-up',
  },
  'sign-up': {
    title: 'Create your account',
    subtitle: 'Start taking bookings in minutes.',
    socialVerb: 'Sign up',
    pending: 'Creating account…',
    switchLabel: 'Already have an account? Sign in',
    switchHref: '/sign-in',
  },
} as const;

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'Google',
};

const credentialsSchema = z.object({
  name: z.string().max(80, 'Name is too long.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

/** Name is only collected on sign-up. */
function authSchema(mode: Mode) {
  return credentialsSchema.superRefine((value, ctx) => {
    if (mode === 'sign-up' && !value.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['name'],
        message: 'Enter your name.',
      });
    }
  });
}

function PasswordInput({
  id,
  value,
  onBlur,
  onChange,
  autoComplete,
  'aria-invalid': ariaInvalid,
}: {
  id: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  'aria-invalid'?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex w-full items-center">
      <Input
        id={id}
        name={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((shown) => !shown)}
        aria-pressed={visible}
        className="absolute right-0.5 text-muted-foreground hover:bg-transparent"
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
        <span className="sr-only">
          {visible ? 'Hide password' : 'Show password'}
        </span>
      </Button>
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [socialPending, setSocialPending] = useState<SocialProvider | null>(
    null,
  );
  const copy = COPY[mode];

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: {
      onSubmit: authSchema(mode),
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const { error: authError } =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: value.name,
              email: value.email,
              password: value.password,
            })
          : await authClient.signIn.email({
              email: value.email,
              password: value.password,
            });

      if (authError) {
        setError(authError.message ?? 'Something went wrong. Try again.');
        return;
      }
      router.replace('/');
      router.refresh();
    },
  });

  async function signInWith(provider: SocialProvider) {
    setSocialPending(provider);
    setError(null);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: '/',
      errorCallbackURL: mode === 'sign-up' ? '/sign-up' : '/sign-in',
    });
    if (authError) {
      setSocialPending(null);
      setError(
        authError.code === 'PROVIDER_NOT_FOUND'
          ? `${PROVIDER_LABEL[provider]} sign-in isn't set up yet.`
          : (authError.message ?? 'Something went wrong. Try again.'),
      );
    }
  }

  return (
    <>
      <div>
        <h1 className="mb-2 text-2xl font-semibold">{copy.title}</h1>
        <p className="text-muted-foreground">{copy.subtitle}</p>
      </div>

      <div className="rounded-2xl bg-popover p-1">
        <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-2.5">
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  type="button"
                  className="w-full"
                  disabled={isSubmitting || socialPending !== null}
                  onClick={() => signInWith('google')}
                >
                  <GoogleIcon />
                  {copy.socialVerb} with Google
                </Button>
              )}
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            id="auth-form"
            className="**:data-[slot=input]:rounded-lg **:data-[slot=input]:border-foreground/10"
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup className="gap-5">
              {mode === 'sign-up' && (
                <form.Field
                  name="name"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid} className="gap-2">
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          autoComplete="name"
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
              )}
              <form.Field
                name="email"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        autoComplete="email"
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="password"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="gap-2">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <PasswordInput
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        autoComplete={
                          mode === 'sign-up'
                            ? 'new-password'
                            : 'current-password'
                        }
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
            </FieldGroup>

            {error && (
              <p role="alert" className="mt-5 text-sm text-destructive">
                {error}
              </p>
            )}
            <form.Subscribe
              selector={(state) => state.isSubmitting}
              children={(isSubmitting) => (
                <Button
                  type="submit"
                  className="mt-6 w-full"
                  disabled={isSubmitting || socialPending !== null}
                >
                  {isSubmitting ? copy.pending : 'Continue'}
                </Button>
              )}
            />
          </form>
        </div>

        <p className="px-6 py-4 text-center text-sm">
          <Link href={copy.switchHref} className="hover:underline">
            {copy.switchLabel}
          </Link>
        </p>
      </div>
    </>
  );
}
