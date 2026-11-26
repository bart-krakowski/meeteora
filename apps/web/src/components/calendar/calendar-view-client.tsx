'use client'

import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { HISTORY_START } from '@/components/bookings/booking-views'
import type { CalendarBooking } from '@/components/calendar/calendar-view'
import { useTRPC } from '@/trpc/provider'

const CalendarView = dynamic(
  () => import('@/components/calendar/calendar-view').then((mod) => mod.CalendarView),
  { ssr: false },
)

export function CalendarViewClient() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const reschedule = useMutation(
    trpc.bookings.reschedule.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: trpc.bookings.list.queryKey() }),
    }),
  )
  const { data: resourceList } = useSuspenseQuery(trpc.resources.list.queryOptions())
  const { data: bookingList } = useSuspenseQuery(
    trpc.bookings.list.queryOptions({ from: HISTORY_START }),
  )
  const { data: eventTypes } = useSuspenseQuery(trpc.eventTypes.list.queryOptions())
  const { data: bookingRules } = useSuspenseQuery(trpc.bookingRules.get.queryOptions())

  const resources = useMemo(
    () => resourceList.map(({ id, name, capacity }) => ({ id, name, capacity })),
    [resourceList],
  )
  const bookings = useMemo<Array<CalendarBooking>>(() => {
    const eventTypeNames = new Map(eventTypes.map(({ id, name }) => [id, name]))
    return bookingList.map((booking) => ({
      id: booking.id,
      resourceId: booking.resourceId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      status: booking.status,
      title: `${eventTypeNames.get(booking.ruleId) ?? 'Booking'} · ${booking.attendee.name}`,
    }))
  }, [bookingList, eventTypes])

  return (
    <CalendarView
      resources={resources}
      bookings={bookings}
      minNoticeMinutes={bookingRules.minNoticeMinutes}
      onMoveBooking={(id, start) => reschedule.mutateAsync({ id, start })}
    />
  )
}
