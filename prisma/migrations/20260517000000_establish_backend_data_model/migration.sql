CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "workosUserId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999'::timestamp,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "hnStoryId" INTEGER NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "text" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "hnPostedAt" TIMESTAMP(6),
    "authorUsername" TEXT,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "commentIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "periodStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999'::timestamp,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEnd" TIMESTAMP(6) NOT NULL DEFAULT '9999-12-31 23:59:59.999999'::timestamp,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_user_history" (
    "historyId" BIGSERIAL PRIMARY KEY,
    "id" TEXT NOT NULL,
    "workosUserId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL,
    "periodEnd" TIMESTAMP(6) NOT NULL
);

CREATE TABLE "story_history" (
    "historyId" BIGSERIAL PRIMARY KEY,
    "id" TEXT NOT NULL,
    "hnStoryId" INTEGER NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "text" TEXT,
    "score" INTEGER NOT NULL,
    "hnPostedAt" TIMESTAMP(6),
    "authorUsername" TEXT,
    "commentCount" INTEGER NOT NULL,
    "commentIds" INTEGER[] NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL,
    "periodEnd" TIMESTAMP(6) NOT NULL
);

CREATE TABLE "favorite_history" (
    "historyId" BIGSERIAL PRIMARY KEY,
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(6) NOT NULL,
    "periodEnd" TIMESTAMP(6) NOT NULL
);

CREATE UNIQUE INDEX "app_users_workosUserId_key" ON "app_users"("workosUserId");
CREATE UNIQUE INDEX "stories_hnStoryId_key" ON "stories"("hnStoryId");
CREATE UNIQUE INDEX "favorites_appUserId_storyId_key" ON "favorites"("appUserId", "storyId");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION record_app_user_history() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        INSERT INTO "app_user_history" ("id", "workosUserId", "periodStart", "periodEnd")
        VALUES (OLD."id", OLD."workosUserId", OLD."periodStart", CURRENT_TIMESTAMP);

        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    INSERT INTO "app_user_history" ("id", "workosUserId", "periodStart", "periodEnd")
    VALUES (OLD."id", OLD."workosUserId", OLD."periodStart", CURRENT_TIMESTAMP);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION record_story_history() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        INSERT INTO "story_history" ("id", "hnStoryId", "title", "url", "text", "score", "hnPostedAt", "authorUsername", "commentCount", "commentIds", "periodStart", "periodEnd")
        VALUES (OLD."id", OLD."hnStoryId", OLD."title", OLD."url", OLD."text", OLD."score", OLD."hnPostedAt", OLD."authorUsername", OLD."commentCount", OLD."commentIds", OLD."periodStart", CURRENT_TIMESTAMP);

        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    INSERT INTO "story_history" ("id", "hnStoryId", "title", "url", "text", "score", "hnPostedAt", "authorUsername", "commentCount", "commentIds", "periodStart", "periodEnd")
    VALUES (OLD."id", OLD."hnStoryId", OLD."title", OLD."url", OLD."text", OLD."score", OLD."hnPostedAt", OLD."authorUsername", OLD."commentCount", OLD."commentIds", OLD."periodStart", CURRENT_TIMESTAMP);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION record_favorite_history() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        INSERT INTO "favorite_history" ("id", "appUserId", "storyId", "periodStart", "periodEnd")
        VALUES (OLD."id", OLD."appUserId", OLD."storyId", OLD."periodStart", CURRENT_TIMESTAMP);

        NEW."periodStart" := CURRENT_TIMESTAMP;
        NEW."periodEnd" := '9999-12-31 23:59:59.999999'::timestamp;
        RETURN NEW;
    END IF;

    INSERT INTO "favorite_history" ("id", "appUserId", "storyId", "periodStart", "periodEnd")
    VALUES (OLD."id", OLD."appUserId", OLD."storyId", OLD."periodStart", CURRENT_TIMESTAMP);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "app_users_record_history"
BEFORE INSERT OR UPDATE OR DELETE ON "app_users"
FOR EACH ROW EXECUTE FUNCTION record_app_user_history();

CREATE TRIGGER "stories_record_history"
BEFORE INSERT OR UPDATE OR DELETE ON "stories"
FOR EACH ROW EXECUTE FUNCTION record_story_history();

CREATE TRIGGER "favorites_record_history"
BEFORE INSERT OR UPDATE OR DELETE ON "favorites"
FOR EACH ROW EXECUTE FUNCTION record_favorite_history();
