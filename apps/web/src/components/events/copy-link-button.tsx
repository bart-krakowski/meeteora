'use client';

import { Button } from '@meeteora/ui/components/button';
import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon } from '@meeteora/ui/components/icons';

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
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}
