-- PR-3 Phase 1 — DOOH 분모 체계 (contactRate + SOV Fact 입력 + Computed 스냅샷)
-- docs/pr3-redesign.md §A · #396 · GG/HH Phase 1
-- ✅ 적용: 2026-08-18 Preview 검증 → Production deploy

-- MediaFactSheet: loop/SOV 사양 (판매 단위·커버리지는 Phase 2)
ALTER TABLE "media_fact_sheets"
  ADD COLUMN IF NOT EXISTS "spot_duration_sec" INTEGER,
  ADD COLUMN IF NOT EXISTS "loop_duration_sec" INTEGER,
  ADD COLUMN IF NOT EXISTS "plays_per_hour" INTEGER;

-- MediaComputedMetric: contactRate · sovShare 스냅샷
ALTER TABLE "media_computed_metrics"
  ADD COLUMN IF NOT EXISTS "contact_rate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "contact_rate_basis" TEXT,
  ADD COLUMN IF NOT EXISTS "contact_rate_input_visibility" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "contact_rate_input_class" TEXT,
  ADD COLUMN IF NOT EXISTS "sov_share" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sov_share_basis" TEXT;

COMMENT ON COLUMN "media_fact_sheets"."spot_duration_sec" IS 'PR-3 Phase 1: DOOH 소재 길이(초) — SOV derived 입력';
COMMENT ON COLUMN "media_fact_sheets"."loop_duration_sec" IS 'PR-3 Phase 1: DOOH loop 1회전(초)';
COMMENT ON COLUMN "media_fact_sheets"."plays_per_hour" IS 'PR-3 Phase 1: 시간당 재생 보장 방식';
COMMENT ON COLUMN "media_computed_metrics"."contact_rate" IS 'PR-3 Phase 1: OTS→LTS. E-4: DEFAULT[class]×(0.8+0.4×visibility/100)';
COMMENT ON COLUMN "media_computed_metrics"."sov_share" IS 'PR-3 Phase 1: LTS→Impression SOV 스냅샷';
