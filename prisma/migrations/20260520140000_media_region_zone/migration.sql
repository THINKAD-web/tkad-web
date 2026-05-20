-- Additive: 표준 권역 코드 (기존 행 유지)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "region_zone" TEXT;

CREATE INDEX IF NOT EXISTS "media_region_zone_idx" ON "media"("region_zone");
