import { between, compileSchedule, merge, weekday } from "@tanstack/time";
import type { SlotResource, WorkingCalendar } from "@tanstack/time";

export const TIME_ZONE = "Europe/Warsaw";

export const CALENDAR_ID = "business-hours";

/** Applied to every event type until they are configurable per type. */
export const RULE_DEFAULTS = {
  bufferAfter: 10,
  minNotice: 120,
  maxHorizon: 30,
} as const;

export const calendars: Array<WorkingCalendar> = [
  compileSchedule({
    id: CALENDAR_ID,
    timeZone: TIME_ZONE,
    on: [
      merge(
        weekday("monday", "tuesday", "wednesday", "thursday", "friday"),
        between("09:00", "17:00"),
      ),
    ],
  }),
];

export const resources: Array<SlotResource> = [{ id: "host-1" }];
