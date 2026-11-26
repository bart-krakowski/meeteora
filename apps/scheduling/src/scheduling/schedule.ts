import {
  between,
  compileSchedule,
  date,
  merge,
  weekday,
} from "@tanstack/time";
import type { SlotRule, WorkingCalendar } from "@tanstack/time";
import {
  type BookingRulesSettings,
  type ResourceHours,
  WEEKDAYS,
} from "@meeteora/contracts";

export const TIME_ZONE = "Europe/Warsaw";

/** Used when an organization has no stored booking rules yet (matches the 0010 seed). */
export const DEFAULT_BOOKING_RULES: BookingRulesSettings = {
  slotStepMinutes: null,
  minNoticeMinutes: 120,
  bufferAfterMinutes: 10,
  maxHorizonDays: 30,
};

export function resourceCalendarId(resourceId: string): string {
  return `resource:${resourceId}`;
}

/** The working calendar one resource's slots are generated against. */
export function toWorkingCalendar(
  resourceId: string,
  hours: ResourceHours,
): WorkingCalendar {
  return compileSchedule({
    id: resourceCalendarId(resourceId),
    timeZone: TIME_ZONE,
    on: WEEKDAYS.flatMap((day) =>
      hours.weekly[day].map((range) =>
        merge(weekday(day), between(range.start, range.end)),
      ),
    ),
    except: hours.daysOff.map(date),
  });
}

/** The parts of a slot rule that come from booking rules, shared by every event type. */
export function toRuleSettings(
  rules: BookingRulesSettings,
): Pick<SlotRule, "step" | "bufferAfter" | "minNotice" | "maxHorizon"> {
  return {
    ...(rules.slotStepMinutes !== null && { step: rules.slotStepMinutes }),
    bufferAfter: rules.bufferAfterMinutes,
    minNotice: rules.minNoticeMinutes,
    maxHorizon: rules.maxHorizonDays,
  };
}
