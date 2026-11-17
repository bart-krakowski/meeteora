'use client'

import dynamic from 'next/dynamic'
import type { CalendarViewProps } from '@/components/calendar/calendar-view'

const CalendarView = dynamic(
  () => import('@/components/calendar/calendar-view').then((mod) => mod.CalendarView),
  { ssr: false },
)

export function CalendarViewClient(props: CalendarViewProps) {
  return <CalendarView {...props} />
}
