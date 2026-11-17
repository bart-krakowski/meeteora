import { connection } from "next/server";
import {
  type BookingView,
  HISTORY_START,
  isBookingView,
} from "@/components/bookings/booking-views";
import { BookingsView } from "@/components/bookings/bookings-view";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  await connection();
  const { view: viewParam } = await searchParams;
  const view: BookingView = isBookingView(viewParam) ? viewParam : "upcoming";
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.bookings.list.queryOptions({ from: HISTORY_START })),
    queryClient.prefetchQuery(trpc.eventTypes.list.queryOptions()),
    queryClient.prefetchQuery(trpc.resources.list.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <BookingsView view={view} now={new Date().toISOString()} />
    </HydrateClient>
  );
}
