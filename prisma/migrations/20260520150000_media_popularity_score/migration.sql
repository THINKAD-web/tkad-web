-- Media popularity score (cron-updated engagement blend)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "popularity_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "popularity_updated_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "media_is_active_popularity_score_idx"
  ON "media" ("is_active", "popularity_score" DESC);
