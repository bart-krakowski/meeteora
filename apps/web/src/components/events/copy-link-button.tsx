'use client';

import { Button } from '@scheduler/ui/components/button';
import { Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';

/** Copies an absolute URL for an app path, e.g. `/e/my-event`. */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(
          `${window.location.origin}${path}`,
        );
        setCopied(true);
        timer.current = setTimeout(() => setCopied(false), 1500);
      }}
    >
      <HugeiconsIcon
        icon={copied ? Tick02Icon : Copy01Icon}
        strokeWidth={2}
      />
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}
