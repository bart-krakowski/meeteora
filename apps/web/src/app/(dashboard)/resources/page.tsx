import { connection } from "next/server";
import { PageBody, PageHeader } from "@/components/page-header";
import { AddResourceDialog } from "@/components/resources/resource-dialogs";
import { type ResourceRow, ResourcesTable } from "@/components/resources/resources-table";
import { api } from "@/trpc/server";

export default async function ResourcesPage() {
  await connection();
  const now = new Date().toISOString();
  const [resources, bookings] = await Promise.all([
    api.resources.list(),
    api.bookings.list({ from: now }),
  ]);

  const upcoming = new Map<string, number>();
  for (const booking of bookings) {
    if (booking.status !== "confirmed") continue;
    upcoming.set(booking.resourceId, (upcoming.get(booking.resourceId) ?? 0) + 1);
  }
  const rows: Array<ResourceRow> = resources.map(({ id, name }) => ({
    id,
    name,
    upcoming: upcoming.get(id) ?? 0,
  }));

  return (
    <PageBody>
      <PageHeader
        title="Resources"
        description="Hosts that bookings are held by. Each is offered Monday to Friday, 9:00 to 17:00, for every event type."
        actions={<AddResourceDialog />}
      />
      <ResourcesTable resources={rows} />
    </PageBody>
  );
}
