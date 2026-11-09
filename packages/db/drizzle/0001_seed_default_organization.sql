INSERT INTO "organizations" ("slug", "name", "time_zone")
VALUES ('default', 'Default', 'Europe/Warsaw')
ON CONFLICT ("slug") DO NOTHING;
