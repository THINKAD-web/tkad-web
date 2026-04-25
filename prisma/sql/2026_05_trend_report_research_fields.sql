-- TrendReport 데이터 수집 필드 (PR-2)
-- - sources: Tavily 등 웹 검색 인용 출처 (JSONB 배열)
-- - internal_data_used: 자체 매체 DB 인사이트 라벨 (TEXT 배열)
-- Idempotent — Neon SQL editor 에서 직접 실행.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'sources'
  ) THEN
    ALTER TABLE "trend_reports" ADD COLUMN "sources" JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trend_reports' AND column_name = 'internal_data_used'
  ) THEN
    ALTER TABLE "trend_reports"
      ADD COLUMN "internal_data_used" TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
