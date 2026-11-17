"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
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
import { useState, useTransition } from "react";
import {
  simulateBookingAction,
  simulateCancellationAction,
} from "@/app/(dashboard)/actions";
import { useInvalidateBookings } from "@/components/bookings/use-invalidate-bookings";
import { navItems } from "@/components/nav-items";

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const invalidateBookings = useInvalidateBookings();

  useHotkey("Meta+K", () => setOpen((prev) => !prev));

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const simulate = (action: () => Promise<void>) => () =>
    startTransition(async () => {
      await action();
      await invalidateBookings();
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
