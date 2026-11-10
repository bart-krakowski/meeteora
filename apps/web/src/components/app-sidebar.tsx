"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@meeteora/ui/components/sidebar";
import type * as React from "react";
import { Logo } from "@/components/logo";
import { NavDevelopment } from "@/components/nav-development";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: React.ComponentProps<typeof NavUser>["user"];
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <Logo className="size-8 text-white" />
          <NotificationsPanel />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        {process.env.NODE_ENV === "development" && <NavDevelopment />}
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
