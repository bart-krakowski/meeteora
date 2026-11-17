import { connection } from "next/server";
import { OverviewView } from "@/components/overview/overview-view";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function OverviewPage() {
  await connection();
  // Fixed per request so server prefetch and client query share one key.
  const now = new Date().toISOString();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.bookings.list.queryOptions({ from: now })),
    queryClient.prefetchQuery(trpc.slots.list.queryOptions()),
    queryClient.prefetchQuery(trpc.eventTypes.list.queryOptions()),
    queryClient.prefetchQuery(trpc.resources.list.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <OverviewView now={now} />
    </HydrateClient>
  );
}
