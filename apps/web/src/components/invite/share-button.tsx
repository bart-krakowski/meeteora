"use client";

import { Link01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

/** Copies the event URL. The status is announced for screen readers. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      aria-label={`Copy link to ${title}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
        } catch {
          window.prompt("Copy this link", window.location.href);
          return;
        }
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] border border-foreground/12 px-3 text-[13px] font-medium text-foreground transition-[border-color,background-color,transform] hover:border-foreground/30 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.97]"
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Link01Icon}
        size={14}
        strokeWidth={1.8}
        aria-hidden
      />
      <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
    </button>
  );
}
