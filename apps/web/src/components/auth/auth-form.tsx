"use client";

import {
  GoogleIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@meeteora/ui/components/button";
import { Input } from "@meeteora/ui/components/input";
import { Label } from "@meeteora/ui/components/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";
type SocialProvider = "google";

const COPY = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Sign in to manage your bookings and events.",
    socialVerb: "Sign in",
    pending: "Signing in…",
    switchLabel: "Create account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Start taking bookings in minutes.",
    socialVerb: "Sign up",
    pending: "Creating account…",
    switchLabel: "Already have an account? Sign in",
    switchHref: "/sign-in",
  },
} as const;

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
};

function PasswordInput({ autoComplete }: { autoComplete: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex w-full items-center">
      <Input
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        minLength={8}
        autoComplete={autoComplete}
        required
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        className="absolute right-0.5 text-muted-foreground hover:bg-transparent"
      >
        <HugeiconsIcon
          icon={visible ? ViewOffSlashIcon : ViewIcon}
          strokeWidth={2}
        />
        <span className="sr-only">
          {visible ? "Hide password" : "Show password"}
        </span>
      </Button>
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | SocialProvider | null>(null);
  const copy = COPY[mode];

  async function signInWith(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    const { error: authError } = await authClient.signIn.social({
      provider,
      callbackURL: "/",
      errorCallbackURL: mode === "sign-up" ? "/sign-up" : "/sign-in",
    });
    if (authError) {
      setPending(null);
      setError(
        authError.code === "PROVIDER_NOT_FOUND"
          ? `${PROVIDER_LABEL[provider]} sign-in isn't set up yet.`
          : (authError.message ?? "Something went wrong. Try again."),
      );
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    setPending("email");
    setError(null);
    const { error: authError } =
      mode === "sign-up"
        ? await authClient.signUp.email({
            name: String(data.get("name") ?? ""),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

    if (authError) {
      setPending(null);
      setError(authError.message ?? "Something went wrong. Try again.");
      return;
    }
    router.replace("/");
    router.refresh();
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
            <Button
              type="button"
              className="w-full"
              disabled={pending !== null}
              onClick={() => signInWith("google")}
            >
              <HugeiconsIcon icon={GoogleIcon} strokeWidth={2} />
              {copy.socialVerb} with Google
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            className="flex flex-col gap-5 **:data-[slot=input]:rounded-lg **:data-[slot=input]:border-foreground/10"
            onSubmit={onSubmit}
          >
            {mode === "sign-up" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" autoComplete="name" required />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="mt-1 w-full"
              disabled={pending !== null}
            >
              {pending === "email" ? copy.pending : "Continue"}
            </Button>
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
