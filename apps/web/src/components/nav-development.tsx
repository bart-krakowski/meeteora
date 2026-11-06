"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@scheduler/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@scheduler/ui/components/sidebar";
import {
  CalendarAdd01Icon,
  CalendarRemove01Icon,
  EraserIcon,
  FlaskConicalIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTransition } from "react";
import {
  simulateBookingAction,
  simulateCancellationAction,
} from "@/app/(dashboard)/actions";
import { useNotifications } from "@/components/notifications/notifications-provider";

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
              <HugeiconsIcon
                icon={FlaskConicalIcon}
                strokeWidth={2}
                className="size-4"
              />
            </span>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Development</span>
              <span className="truncate text-xs text-muted-foreground">
                {pending ? "Working…" : "Local simulation tools"}
              </span>
            </div>
            <HugeiconsIcon
              icon={UnfoldMoreIcon}
              strokeWidth={2}
              className="ml-auto size-4"
            />
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
                <HugeiconsIcon icon={CalendarAdd01Icon} strokeWidth={2} />
                Book a random slot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={simulate(simulateCancellationAction)}>
                <HugeiconsIcon icon={CalendarRemove01Icon} strokeWidth={2} />
                Cancel a random booking
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuItem onClick={clear}>
                <HugeiconsIcon icon={EraserIcon} strokeWidth={2} />
                Clear all
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
