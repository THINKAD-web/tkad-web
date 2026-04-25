-- TrendReport 자동 검증 결과 컬럼 (PR-3)
-- - validation_score: 0~100 종합 점수
-- - validation_result: 상세 결과 JSONB
--   { verdict, scores: {factual, legal, tone, seo}, issues[], shouldPublish,
--     requiresHumanReview, validatedAt, modelUsed }
-- Idempotent — Neon SQL editor 에서 직접 실행.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'validation_score'
  ) THEN
    ALTER TABLE "trend_reports" ADD COLUMN "validation_score" INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'validation_result'
  ) THEN
    ALTER TABLE "trend_reports" ADD COLUMN "validation_result" JSONB;
  END IF;
END $$;

-- 검증 점수 인덱스 (어드민 큐 정렬·필터)
CREATE INDEX IF NOT EXISTS "trend_reports_validation_score_idx"
  ON "trend_reports" ("validation_score" DESC NULLS LAST);
