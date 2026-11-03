'use client';

import {
  Sidebar,
  SidebarContent,
} from '@scheduler/ui/components/sidebar';
import type * as React from 'react';
import { NavMain } from '@/components/nav-main';

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  );
}
