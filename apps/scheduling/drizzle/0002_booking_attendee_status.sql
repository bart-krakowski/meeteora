ALTER TABLE "bookings" ADD COLUMN "attendee_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "attendee_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "attendee_email" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "attendee_email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "status" text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancelled_at" timestamp with time zone;
