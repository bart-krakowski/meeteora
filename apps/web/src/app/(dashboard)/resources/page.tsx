import { connection } from "next/server";
import { PageBody } from "@/components/page-header";
import { type ResourceRow, ResourcesView } from "@/components/resources/resources-view";
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
  const rows: Array<ResourceRow> = resources.map((resource) => ({
    ...resource,
    upcoming: upcoming.get(resource.id) ?? 0,
  }));

  return (
    <PageBody>
      <ResourcesView resources={rows} />
    </PageBody>
  );
}
