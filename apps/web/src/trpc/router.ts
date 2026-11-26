import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { ApiError } from "@/lib/api-client";
import {
  cancelBooking,
  createBooking,
  createEventType,
  createResource,
  deleteEventType,
  deleteResource,
  fetchBookingRules,
  fetchBookings,
  fetchEventTypes,
  fetchResources,
  fetchSlots,
  rescheduleBooking,
  updateBookingRules,
  updateResource,
} from "@/lib/api";
import {
  getPublicEvent,
  listPublicEvents,
  RegistrationError,
  registerForEvent,
} from "@/lib/events/store";

const t = initTRPC.create();

function toTrpcCode(status: number | undefined): TRPCError["code"] {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

/** Translates ApiClient failures into typed tRPC errors. */
async function call<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      throw new TRPCError({
        code: toTrpcCode(error.status),
        message: error.message,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error instanceof Error ? error.message : "Request failed",
    });
  }
}

const bookings = t.router({
  list: t.procedure
    .input(z.object({ from: z.string().datetime().optional() }).optional())
    .query(({ input }) =>
      call(() =>
        fetchBookings(input?.from ? new Date(input.from) : new Date()),
      ),
    ),
  create: t.procedure
    .input(
      z.object({
        ruleId: z.string().uuid(),
        start: z.string(),
        attendee: z.object({
          name: z.string().trim().min(1),
          email: z.string().trim().email(),
        }),
      }),
    )
    .mutation(({ input }) => call(() => createBooking(input))),
  cancel: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => call(() => cancelBooking(input.id))),
  reschedule: t.procedure
    .input(z.object({ id: z.string().uuid(), start: z.string().datetime() }))
    .mutation(({ input }) =>
      call(() => rescheduleBooking(input.id, input.start)),
    ),
});

const eventTypes = t.router({
  list: t.procedure.query(() => call(fetchEventTypes)),
  create: t.procedure
    .input(
      z.object({
        name: z.string().trim().min(1),
        durationMinutes: z.number().int().min(5).max(480),
      }),
    )
    .mutation(({ input }) => call(() => createEventType(input))),
  delete: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => call(() => deleteEventType(input.id))),
});

const resourceInput = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  capacity: z.number().int().min(1).max(1000),
});

const hm = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/, "Use HH:MM.");
const dayRanges = z.array(z.object({ start: hm, end: hm })).max(8);
const resourceHoursInput = z.object({
  weekly: z.object({
    monday: dayRanges,
    tuesday: dayRanges,
    wednesday: dayRanges,
    thursday: dayRanges,
    friday: dayRanges,
    saturday: dayRanges,
    sunday: dayRanges,
  }),
  daysOff: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(366),
});

const resources = t.router({
  list: t.procedure.query(() => call(fetchResources)),
  create: t.procedure
    .input(resourceInput)
    .mutation(({ input }) => call(() => createResource(input))),
  update: t.procedure
    .input(resourceInput.extend({ id: z.string().uuid() }))
    .mutation(({ input: { id, ...input } }) =>
      call(() => updateResource(id, input)),
    ),
  updateHours: t.procedure
    .input(resourceHoursInput.extend({ id: z.string().uuid() }))
    .mutation(({ input: { id, ...hours } }) =>
      call(() => updateResource(id, hours)),
    ),
  delete: t.procedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => call(() => deleteResource(input.id))),
});

const bookingRules = t.router({
  get: t.procedure.query(() => call(fetchBookingRules)),
  update: t.procedure
    .input(
      z.object({
        slotStepMinutes: z.number().int().min(5).max(240).nullable(),
        minNoticeMinutes: z.number().int().min(0).max(30 * 24 * 60),
        bufferAfterMinutes: z.number().int().min(0).max(240),
        maxHorizonDays: z.number().int().min(1).max(365),
      }),
    )
    .mutation(({ input }) => call(() => updateBookingRules(input))),
});

const slots = t.router({
  list: t.procedure.query(() => call(fetchSlots)),
});

const publicEvents = t.router({
  list: t.procedure.query(() => listPublicEvents()),
  bySlug: t.procedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(({ input }) => {
      const event = getPublicEvent(input.slug);
      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
      }
      return event;
    }),
  register: t.procedure
    .input(
      z.object({
        slug: z.string().min(1),
        name: z.string().trim().min(1, "Enter your name.").max(80),
        email: z.string().trim().email("Enter a valid email address."),
      }),
    )
    .mutation(({ input }) => {
      try {
        return registerForEvent(input.slug, input);
      } catch (error) {
        if (error instanceof RegistrationError) {
          throw new TRPCError({
            code:
              error.code === "not_found"
                ? "NOT_FOUND"
                : error.code === "duplicate"
                  ? "CONFLICT"
                  : "FORBIDDEN",
            message: error.message,
          });
        }
        throw error;
      }
    }),
});

export const appRouter = t.router({
  bookings,
  eventTypes,
  resources,
  bookingRules,
  slots,
  publicEvents,
});

export type AppRouter = typeof appRouter;
