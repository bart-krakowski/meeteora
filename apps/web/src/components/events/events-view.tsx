import { connection } from "next/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import { EventsTable } from "./events-table";

/** The organizer's public events, each with its shareable invitation URL. */
export async function EventsView() {
  await connection();
  await getQueryClient().prefetchQuery(trpc.publicEvents.list.queryOptions());

  return (
    <HydrateClient>
      <PageBody>
        <PageHeader
          title="Events"
          description="Share an event's link; guests register on its invitation page."
        />
        <EventsTable />
      </PageBody>
    </HydrateClient>
  );
}
