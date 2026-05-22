-- Community post metadata + pin (idempotent)
ALTER TABLE "community_posts" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "community_posts" ADD COLUMN IF NOT EXISTS "is_pinned" BOOLEAN NOT NULL DEFAULT false;
