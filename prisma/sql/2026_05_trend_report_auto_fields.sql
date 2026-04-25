-- TrendReport 자동 발행을 위한 컬럼 확장 (PR-1, /ko/insights)
-- - month: NOT NULL → NULL 허용 (자동 발행 row 는 slug 로 식별)
-- - slug: 신규, unique
-- - generation_method: 'manual' | 'auto'
-- - ai_model: 사용 모델 추적
-- Idempotent — Neon SQL editor 에서 직접 실행.

DO $$
BEGIN
  -- 1) month NOT NULL 제약 해제 (이미 nullable 이면 skip)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'month' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "trend_reports" ALTER COLUMN "month" DROP NOT NULL;
  END IF;

  -- 2) slug 컬럼
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'slug'
  ) THEN
    ALTER TABLE "trend_reports" ADD COLUMN "slug" TEXT;
  END IF;

  -- 3) generation_method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'generation_method'
  ) THEN
    ALTER TABLE "trend_reports"
      ADD COLUMN "generation_method" TEXT NOT NULL DEFAULT 'manual';
  END IF;

  -- 4) ai_model
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'ai_model'
  ) THEN
    ALTER TABLE "trend_reports" ADD COLUMN "ai_model" TEXT;
  END IF;
END $$;

-- slug unique index (NULL 다중 허용 — Postgres 기본 동작)
CREATE UNIQUE INDEX IF NOT EXISTS "trend_reports_slug_key"
  ON "trend_reports" ("slug");
