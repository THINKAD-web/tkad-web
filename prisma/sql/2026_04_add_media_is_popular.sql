-- Add isPopular / popularOrder to media (idempotent).
-- Apply via Neon SQL editor OR `npx prisma db push` against DATABASE_URL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media' AND column_name = 'is_popular'
  ) THEN
    ALTER TABLE "media" ADD COLUMN "is_popular" boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media' AND column_name = 'popular_order'
  ) THEN
    ALTER TABLE "media" ADD COLUMN "popular_order" integer;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "media_is_popular_popular_order_idx"
  ON "media" ("is_popular", "popular_order");
