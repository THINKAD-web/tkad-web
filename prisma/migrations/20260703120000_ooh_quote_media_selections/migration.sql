-- Additive: store wizard price-option snapshot at quote submit time.
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "media_selections" JSONB;
