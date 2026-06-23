-- Additive: network browse taxonomy + venue + target (no existing column changes)
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "media_main_category" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "media_sub_category" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "region_main" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "region_sub" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "target_category" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "venue_type" TEXT;

CREATE INDEX IF NOT EXISTS "media_networks_media_main_category_media_sub_category_idx"
  ON "media_networks"("media_main_category", "media_sub_category");
CREATE INDEX IF NOT EXISTS "media_networks_region_main_region_sub_idx"
  ON "media_networks"("region_main", "region_sub");
