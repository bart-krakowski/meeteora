export * from './auth-schema';
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const NINE_TO_FIVE = [{ start: "09:00", end: "17:00" }];

/** New resources open Mon–Fri 09:00–17:00. */
export const DEFAULT_WEEKLY: Record<string, Array<{ start: string; end: string }>> = {
  monday: NINE_TO_FIVE,
  tuesday: NINE_TO_FIVE,
  wednesday: NINE_TO_FIVE,
  thursday: NINE_TO_FIVE,
  friday: NINE_TO_FIVE,
  saturday: [],
  sunday: [],
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  timeZone: text("time_zone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventTypes = pgTable(
  "event_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.organizationId, t.slug)],
);

/** Who or what a booking is held by (a host, a room). Slots are offered per resource. */
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** How many bookings may overlap on this resource at once. */
  capacity: integer("capacity").notNull().default(1),
  /** Weekday -> list of { start, end } "HH:MM" ranges; Mon–Fri 09:00–17:00 by default. */
  weekly: jsonb("weekly")
    .$type<Record<string, Array<{ start: string; end: string }>>>()
    .notNull()
    .default(DEFAULT_WEEKLY),
  /** "YYYY-MM-DD" dates closed all day. */
  daysOff: jsonb("days_off").$type<Array<string>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Slot rules shared by every resource, one row per organization. */
export const availability = pgTable("availability", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  /** Null: slots start every event length. */
  slotStepMinutes: integer("slot_step_minutes"),
  minNoticeMinutes: integer("min_notice_minutes").notNull().default(120),
  bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(10),
  maxHorizonDays: integer("max_horizon_days").notNull().default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic").notNull(),
  payload: jsonb("payload").$type<unknown>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").notNull(),
  resourceId: text("resource_id").notNull(),
  attendeeName: text("attendee_name").notNull(),
  attendeeEmail: text("attendee_email").notNull(),
  status: text("status", { enum: ["confirmed", "cancelled"] })
    .notNull()
    .default("confirmed"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
