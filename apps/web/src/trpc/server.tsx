import 'server-only';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';
import { makeQueryClient } from './query-client';
import { appRouter } from './router';

/** Server-side caller for RSC pages and server actions — same router as /api/trpc. */
export const api = appRouter.createCaller({});

/** One QueryClient per request. */
export const getQueryClient = cache(makeQueryClient);

/** Query options for prefetching in RSC; keys match the client's `useTRPC()`. */
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: {},
  queryClient: getQueryClient,
});

/** Hands this request's prefetched queries to client components below. */
export function HydrateClient({ children }: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}
