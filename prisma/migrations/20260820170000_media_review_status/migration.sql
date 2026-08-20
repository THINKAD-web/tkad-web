-- Phase B Operational flags (not Computed). Default clean = grandfather existing rows.
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "review_status" TEXT NOT NULL DEFAULT 'clean';
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "review_reason" TEXT;
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "flagged_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "media_is_active_review_status_idx"
  ON "media" ("is_active", "review_status");
