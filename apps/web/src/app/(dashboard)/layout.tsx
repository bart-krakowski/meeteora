import { SidebarInset, SidebarProvider } from '@meeteora/ui/components/sidebar';
import type * as React from 'react';
import { Toaster } from '@meeteora/ui/components/sonner';
import { AppSidebar } from '@/components/app-sidebar';
import { NotificationsProvider } from '@/components/notifications/notifications-provider';
import { SiteHeader } from '@/components/site-header';
import { requireSession } from '@/lib/auth/session';
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server';
import '../calendar.css';
import { AgentChat } from '@/components/agent/agent-chat';

const shellStyle: React.CSSProperties = {
  '--sidebar-width': 'calc(var(--spacing) * 64)',
  '--header-height': 'calc(var(--spacing) * 12)',
};

export default async function DashboardLayout({ children }: LayoutProps<'/'>) {
  const { user } = await requireSession();
  // NotificationsProvider reads event types above every page. Hydrate them here:
  // a page's HydrationBoundary can't fill a query that already exists during SSR.
  await getQueryClient().prefetchQuery(trpc.eventTypes.list.queryOptions());

  return (
    <HydrateClient>
      <NotificationsProvider>
        <SidebarProvider style={shellStyle}>
          <AppSidebar
            variant="inset"
            user={{
              name: user.name,
              email: user.email,
              avatar: user.image ?? undefined,
            }}
          />
          <SidebarInset className="md:peer-data-[variant=inset]:mb-0">
            <div className="@container/main flex min-h-0 flex-1 flex-col overflow-y-auto bg-background md:rounded-2xl">
              <SiteHeader />
              {children}
            </div>
            <footer className="flex py-1 w-full shrink-0 items-center justify-end-safe gap-2">
              <AgentChat />
            </footer>
          </SidebarInset>
        </SidebarProvider>
        <Toaster theme="dark" />
      </NotificationsProvider>
    </HydrateClient>
  );
}
