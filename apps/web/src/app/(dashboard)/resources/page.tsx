import { connection } from "next/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { AddResourceDialog } from "@/components/resources/resource-dialogs";
import { ResourcesTable } from "@/components/resources/resources-table";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function ResourcesPage() {
  await connection();
  // Fixed per request so server prefetch and client query share one key.
  const upcomingFrom = new Date().toISOString();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.resources.list.queryOptions()),
    queryClient.prefetchQuery(
      trpc.bookings.list.queryOptions({ from: upcomingFrom }),
    ),
  ]);

  return (
    <HydrateClient>
      <PageBody>
        <PageHeader title="Resources" actions={<AddResourceDialog />} />
        <ResourcesTable upcomingFrom={upcomingFrom} />
      </PageBody>
    </HydrateClient>
  );
}
