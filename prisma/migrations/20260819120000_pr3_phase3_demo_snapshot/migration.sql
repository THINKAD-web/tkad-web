-- PR-3 Phase 3 — demo gender/age 스냅샷 (Computed)
-- docs/pr3-redesign.md §B · #396
-- Phase 1 패턴: IF NOT EXISTS + COMMENT

ALTER TABLE "media_computed_metrics"
  ADD COLUMN IF NOT EXISTS "demo_gender_split" JSONB,
  ADD COLUMN IF NOT EXISTS "demo_age_split" JSONB,
  ADD COLUMN IF NOT EXISTS "demo_source_signal_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN "media_computed_metrics"."demo_gender_split" IS 'PR-3 Phase 3: { male, female } — Signal 병합·실측 스냅샷';
COMMENT ON COLUMN "media_computed_metrics"."demo_age_split" IS 'PR-3 Phase 3: { "10s"..."50s+" } — Signal 병합·실측 스냅샷';
COMMENT ON COLUMN "media_computed_metrics"."demo_source_signal_ids" IS 'PR-3 Phase 3: demo_* 산출에 사용한 MediaExternalSignal id 목록';
