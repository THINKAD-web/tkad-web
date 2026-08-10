-- PR-3 (진단서 §4) — 매체 지표 계산에 필요한 신규 컬럼 + CampaignPlan 스냅샷 테이블.
--
-- 전 필드 nullable. 데이터 이관은 PR-4 (별도 PR, 감사 리포트 검토 후) 에서 수행한다.
-- 이 마이그레이션 자체는 backfill 이 없으므로 기존 매체에 영향을 주지 않는다.

-- ─────────────────────────────────────────────────────────────
-- Media — 노출·CPM·타깃·크리에이티브 필드
-- ─────────────────────────────────────────────────────────────

ALTER TABLE "media"
  ADD COLUMN IF NOT EXISTS "selling_unit"           TEXT,
  ADD COLUMN IF NOT EXISTS "unit_daily_traffic"     INTEGER,
  ADD COLUMN IF NOT EXISTS "traffic_source"         TEXT,
  ADD COLUMN IF NOT EXISTS "traffic_updated_at"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "contact_rate"           DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "contact_rate_basis"     TEXT,
  ADD COLUMN IF NOT EXISTS "spot_duration"          INTEGER,
  ADD COLUMN IF NOT EXISTS "loop_duration"          INTEGER,
  ADD COLUMN IF NOT EXISTS "plays_per_hour"         INTEGER,
  ADD COLUMN IF NOT EXISTS "coverage_dongs"         JSONB,
  ADD COLUMN IF NOT EXISTS "coverage_population"    INTEGER,
  ADD COLUMN IF NOT EXISTS "demo_gender_split"      JSONB,
  ADD COLUMN IF NOT EXISTS "demo_age_split"         JSONB,
  ADD COLUMN IF NOT EXISTS "demo_source"            TEXT,
  ADD COLUMN IF NOT EXISTS "demo_confidence"        TEXT,
  ADD COLUMN IF NOT EXISTS "resolution_w"           INTEGER,
  ADD COLUMN IF NOT EXISTS "resolution_h"           INTEGER,
  ADD COLUMN IF NOT EXISTS "aspect_ratio"           TEXT,
  ADD COLUMN IF NOT EXISTS "file_formats"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "max_file_size_mb"       INTEGER,
  ADD COLUMN IF NOT EXISTS "has_audio"              BOOLEAN,
  ADD COLUMN IF NOT EXISTS "submission_deadline"    INTEGER,
  ADD COLUMN IF NOT EXISTS "region_code"            TEXT;

-- 감사 R-01 (인구 상한) · demo confidence 배지 · 시도 필터 성능
CREATE INDEX IF NOT EXISTS "media_region_code_idx"      ON "media"("region_code");
CREATE INDEX IF NOT EXISTS "media_demo_confidence_idx"  ON "media"("demo_confidence");

-- ─────────────────────────────────────────────────────────────
-- CampaignPlan — 저장·공유 플랜 (30일 TTL, engineVersion 스냅샷)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "campaign_plans" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "share_token"    TEXT NOT NULL,
  "owner_id"       TEXT,
  "brief"          JSONB NOT NULL,
  "media_mix"      JSONB NOT NULL,
  "metrics"        JSONB NOT NULL,
  "engine_version" TEXT NOT NULL,
  "expires_at"     TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_plans_share_token_key" ON "campaign_plans"("share_token");
CREATE INDEX IF NOT EXISTS "campaign_plans_owner_id_idx"    ON "campaign_plans"("owner_id");
CREATE INDEX IF NOT EXISTS "campaign_plans_expires_at_idx"  ON "campaign_plans"("expires_at");

-- 소유자 정리 시 ON DELETE SET NULL (Prisma 스키마와 일치)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_plans_owner_id_fkey'
  ) THEN
    ALTER TABLE "campaign_plans"
      ADD CONSTRAINT "campaign_plans_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
