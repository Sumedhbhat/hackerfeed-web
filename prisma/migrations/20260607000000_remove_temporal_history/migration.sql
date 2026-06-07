DROP TRIGGER IF EXISTS "favorites_record_history" ON "favorites";
DROP TRIGGER IF EXISTS "stories_record_history" ON "stories";
DROP TRIGGER IF EXISTS "app_users_record_history" ON "app_users";

DROP FUNCTION IF EXISTS record_favorite_history();
DROP FUNCTION IF EXISTS record_story_history();
DROP FUNCTION IF EXISTS record_app_user_history();

DROP TABLE IF EXISTS "favorite_history";
DROP TABLE IF EXISTS "story_history";
DROP TABLE IF EXISTS "app_user_history";

ALTER TABLE "favorites"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN IF EXISTS "periodStart",
DROP COLUMN IF EXISTS "periodEnd";

ALTER TABLE "stories"
DROP COLUMN IF EXISTS "periodStart",
DROP COLUMN IF EXISTS "periodEnd";

ALTER TABLE "app_users"
DROP COLUMN IF EXISTS "periodStart",
DROP COLUMN IF EXISTS "periodEnd";
