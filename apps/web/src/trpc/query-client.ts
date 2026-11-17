import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';

/** One config for server prefetch and browser cache, so hydration lines up. */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data prefetched on the server is fresh on first render; skip the instant refetch.
        staleTime: 30 * 1000,
      },
      dehydrate: {
        // Also stream queries still pending when the RSC payload is sent.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
    },
  });
}
