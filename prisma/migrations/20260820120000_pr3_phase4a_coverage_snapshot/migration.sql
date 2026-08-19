-- PR-3 Phase 4a — Reach coverage snapshot (Computed)
-- docs/pr3-redesign.md §B · 시·군·구 커버리지 + MOIS 인구 연동 준비
-- Phase 1·3 패턴: IF NOT EXISTS + COMMENT (데이터 백필 없음)

ALTER TABLE "media_computed_metrics"
  ADD COLUMN IF NOT EXISTS "coverage_population" INTEGER,
  ADD COLUMN IF NOT EXISTS "coverage_dongs" JSONB;

COMMENT ON COLUMN "media_computed_metrics"."coverage_population" IS 'PR-3 Phase 4a: 커버 시·군·구 주민등록 인구 합 (Signal population_demographics 스냅샷)';
COMMENT ON COLUMN "media_computed_metrics"."coverage_dongs" IS 'PR-3 Phase 4a: [{ code, weight }] — 시·군·구 adm_cd(5자리) + 노출 배분 가중치';
