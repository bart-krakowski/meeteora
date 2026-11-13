import { connection } from "next/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { api } from "@/trpc/server";
import { EventsTable } from "./events-table";

/** The organizer's public events, each with its shareable invitation URL. */
export async function EventsView() {
  await connection();
  const events = await api.publicEvents.list();

  return (
    <PageBody>
      <PageHeader
        title="Events"
        description="Share an event's link; guests register on its invitation page."
      />
      <EventsTable events={events} />
    </PageBody>
  );
}
