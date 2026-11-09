INSERT INTO "event_types" ("organization_id", "slug", "name", "duration_minutes")
SELECT "id", 'intro-call', 'Intro Call', 30
FROM "organizations"
WHERE "slug" = 'default'
ON CONFLICT DO NOTHING;

UPDATE "bookings"
SET "rule_id" = (
  SELECT "event_types"."id"::text
  FROM "event_types"
  WHERE "event_types"."slug" = 'intro-call'
)
WHERE "rule_id" = 'intro-call';
