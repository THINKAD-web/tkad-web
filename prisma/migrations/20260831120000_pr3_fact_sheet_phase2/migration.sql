-- PR-3 Phase 2: SellingUnit + FactSheet creative/spec columns
-- Migration only — no backfill in this PR.

CREATE TYPE "SellingUnit" AS ENUM (
  'panel',
  'vehicle',
  'station',
  'route',
  'site',
  'network_package',
  'screen'
);

ALTER TABLE "media_fact_sheets"
  ADD COLUMN "selling_unit" "SellingUnit",
  ADD COLUMN "resolution_w" INTEGER,
  ADD COLUMN "resolution_h" INTEGER,
  ADD COLUMN "aspect_ratio" TEXT,
  ADD COLUMN "file_formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "submission_deadline_days" INTEGER,
  ADD COLUMN "region_code" VARCHAR(2);
