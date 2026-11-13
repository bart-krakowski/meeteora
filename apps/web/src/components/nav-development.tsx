"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@meeteora/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@meeteora/ui/components/sidebar";
import { useTransition } from "react";
import {
  simulateBookingAction,
  simulateCancellationAction,
} from "@/app/(dashboard)/actions";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { CalendarMinusIcon, CalendarPlusIcon, ChevronsUpDownIcon, EraserIcon, FlaskIcon } from "@meeteora/ui/components/icons";

export function NavDevelopment() {
  const { isMobile } = useSidebar();
  const { clear } = useNotifications();
  const [pending, startTransition] = useTransition();

  const simulate = (action: () => Promise<void>) => () =>
    startTransition(async () => {
      await action();
    });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={pending}
            render={
              <SidebarMenuButton
                size="lg"
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
              />
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FlaskIcon className="size-4" />
            </span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Development</span>
              <span className="truncate text-xs text-muted-foreground">
                {pending ? "Working…" : "Local simulation tools"}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Simulate bookings</DropdownMenuLabel>
              <DropdownMenuItem onClick={simulate(simulateBookingAction)}>
                <CalendarPlusIcon />
                Book a random slot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={simulate(simulateCancellationAction)}>
                <CalendarMinusIcon />
                Cancel a random booking
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuItem onClick={clear}>
                <EraserIcon />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
