import {
  SidebarInset,
  SidebarProvider,
} from '@meeteora/ui/components/sidebar';
import type * as React from 'react';
import { Toaster } from '@meeteora/ui/components/sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { NotificationsProvider } from '@/components/notifications/notifications-provider';
import { SiteHeader } from '@/components/site-header';
import '../calendar.css';

const shellStyle = {
  '--sidebar-width': 'calc(var(--spacing) * 64)',
  '--header-height': 'calc(var(--spacing) * 12)',
} as React.CSSProperties;

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <NotificationsProvider>
      <SidebarProvider style={shellStyle}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="@container/main flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster theme="dark" />
    </NotificationsProvider>
  );
}
