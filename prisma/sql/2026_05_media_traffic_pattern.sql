-- 매체 시간대/요일/월별 유동인구 패턴 (PR-A)
-- Idempotent — 이미 있으면 skip. Neon SQL editor 에서 직접 실행 권장.
-- shape:
--   {
--     "hourly":  [n1, ..., n24],
--     "weekly":  [n_mon, ..., n_sun],
--     "monthly": [n_jan, ..., n_dec],
--     "updatedAt": "ISO 문자열"
--   }
-- 미입력 매체는 NULL — 클라이언트에서 lib/media-traffic-estimate.ts 의 추정값 사용.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media' AND column_name = 'traffic_pattern'
  ) THEN
    ALTER TABLE "media" ADD COLUMN "traffic_pattern" JSONB;
  END IF;
END $$;
