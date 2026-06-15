-- media_networks / media_network_locations baseline (idempotent)
-- 기존 db push 환경·누락 컬럼 보완 — migrate deploy 로 프로덕션 반영

CREATE TABLE IF NOT EXISTS "media_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "min_units" INTEGER NOT NULL DEFAULT 1,
    "total_locations" INTEGER NOT NULL DEFAULT 0,
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_networks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "price_per_unit" INTEGER;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "price_package" INTEGER;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "price_note" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "gallery_images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "features" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "package_options" JSONB;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "visibility_score" INTEGER;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "daily_footfall" INTEGER;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "target_age" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "effect_memo" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "operating_hours" TEXT;
ALTER TABLE "media_networks" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "media_networks_is_active_type_idx"
  ON "media_networks"("is_active", "type");

CREATE TABLE IF NOT EXISTS "media_network_locations" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_network_locations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "media_id" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "full_address" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "region_main" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "region_sub" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "unit_count" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "price_note" TEXT;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "daily_footfall" INTEGER;
ALTER TABLE "media_network_locations" ADD COLUMN IF NOT EXISTS "note" TEXT;

CREATE INDEX IF NOT EXISTS "media_network_locations_network_id_idx"
  ON "media_network_locations"("network_id");
CREATE INDEX IF NOT EXISTS "media_network_locations_media_id_idx"
  ON "media_network_locations"("media_id");
CREATE INDEX IF NOT EXISTS "media_network_locations_region_main_idx"
  ON "media_network_locations"("region_main");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_network_locations_network_id_fkey'
  ) THEN
    ALTER TABLE "media_network_locations"
      ADD CONSTRAINT "media_network_locations_network_id_fkey"
      FOREIGN KEY ("network_id") REFERENCES "media_networks"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_network_locations_media_id_fkey'
  ) THEN
    ALTER TABLE "media_network_locations"
      ADD CONSTRAINT "media_network_locations_media_id_fkey"
      FOREIGN KEY ("media_id") REFERENCES "media"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
