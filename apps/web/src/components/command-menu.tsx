"use client";

import { Button } from "@meeteora/ui/components/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@meeteora/ui/components/command";
import {
  CalendarMinusIcon,
  CalendarPlusIcon,
  SearchIcon,
} from "@meeteora/ui/components/icons";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  simulateBookingAction,
  simulateCancellationAction,
} from "@/app/(dashboard)/actions";
import { navItems } from "@/components/nav-items";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const simulate = (action: () => Promise<void>) => () =>
    startTransition(async () => {
      await action();
    });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search (⌘K)"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder="Search pages and actions…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup heading="Pages">
              {navItems.map(({ title, href, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={title}
                  onSelect={() => run(() => router.push(href))}
                >
                  <Icon />
                  {title}
                </CommandItem>
              ))}
            </CommandGroup>
            {process.env.NODE_ENV === "development" && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Development">
                  <CommandItem
                    onSelect={() => run(simulate(simulateBookingAction))}
                  >
                    <CalendarPlusIcon />
                    Book a random slot
                  </CommandItem>
                  <CommandItem
                    onSelect={() => run(simulate(simulateCancellationAction))}
                  >
                    <CalendarMinusIcon />
                    Cancel a random booking
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
