ALTER TABLE "resources" ADD COLUMN "weekly" jsonb DEFAULT '{"monday":[{"start":"09:00","end":"17:00"}],"tuesday":[{"start":"09:00","end":"17:00"}],"wednesday":[{"start":"09:00","end":"17:00"}],"thursday":[{"start":"09:00","end":"17:00"}],"friday":[{"start":"09:00","end":"17:00"}],"saturday":[],"sunday":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "days_off" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- Each existing resource starts with the organization-wide hours saved so far.
UPDATE "resources"
SET "weekly" = "availability"."weekly", "days_off" = "availability"."days_off"
FROM "availability"
WHERE "availability"."organization_id" = "resources"."organization_id";--> statement-breakpoint
ALTER TABLE "availability" DROP COLUMN "weekly";--> statement-breakpoint
ALTER TABLE "availability" DROP COLUMN "days_off";