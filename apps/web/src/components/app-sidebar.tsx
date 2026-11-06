"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@scheduler/ui/components/sidebar";
import type * as React from "react";
import { Logo } from "@/components/logo";
import { NavDevelopment } from "@/components/nav-development";
import { NavMain } from "@/components/nav-main";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <Logo className="size-6" />
          <NotificationsPanel />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        {process.env.NODE_ENV === "development" && <NavDevelopment />}
      </SidebarFooter>
    </Sidebar>
  );
}
