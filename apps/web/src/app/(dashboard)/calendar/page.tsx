import { connection } from 'next/server';
import { HISTORY_START } from '@/components/bookings/booking-views';
import { CalendarViewClient } from '@/components/calendar/calendar-view-client';
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server';

export default async function CalendarPage() {
  await connection();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.resources.list.queryOptions()),
    queryClient.prefetchQuery(trpc.bookings.list.queryOptions({ from: HISTORY_START })),
    queryClient.prefetchQuery(trpc.eventTypes.list.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <CalendarViewClient />
    </HydrateClient>
  );
}
