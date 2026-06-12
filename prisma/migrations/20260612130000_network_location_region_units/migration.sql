-- 네트워크 지점: 지역(시도/세부) + 설치 대수
ALTER TABLE "media_network_locations"
  ADD COLUMN "region_main" TEXT,
  ADD COLUMN "region_sub" TEXT,
  ADD COLUMN "unit_count" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "media_network_locations_region_main_idx" ON "media_network_locations"("region_main");
