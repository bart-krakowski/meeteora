CREATE TABLE "availability" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"weekly" jsonb NOT NULL,
	"days_off" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slot_step_minutes" integer,
	"min_notice_minutes" integer DEFAULT 120 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 10 NOT NULL,
	"max_horizon_days" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Seeds today's hard-coded schedule (Mon–Fri 09:00–17:00) for the default organization.
INSERT INTO "availability" ("organization_id", "weekly")
SELECT "id", '{"monday":[{"start":"09:00","end":"17:00"}],"tuesday":[{"start":"09:00","end":"17:00"}],"wednesday":[{"start":"09:00","end":"17:00"}],"thursday":[{"start":"09:00","end":"17:00"}],"friday":[{"start":"09:00","end":"17:00"}],"saturday":[],"sunday":[]}'::jsonb
FROM "organizations"
WHERE "slug" = 'default'
ON CONFLICT DO NOTHING;
