-- The hardcoded "host-1" becomes a stored resource; its bookings point at the new id.
WITH "host" AS (
  INSERT INTO "resources" ("organization_id", "name")
  SELECT "id", 'Host 1'
  FROM "organizations"
  WHERE "slug" = 'default'
    AND NOT EXISTS (SELECT 1 FROM "resources")
  RETURNING "id"
)
UPDATE "bookings"
SET "resource_id" = "host"."id"::text
FROM "host"
WHERE "bookings"."resource_id" = 'host-1';
