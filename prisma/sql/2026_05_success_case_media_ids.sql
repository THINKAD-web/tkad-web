-- SuccessCase ↔ Media 양방향 연결 (PR-B)
-- 기존 mediaUsed (text[]) 는 카테고리 텍스트 라벨용으로 보존.
-- 신규 media_ids 컬럼으로 실제 Media.id 배열을 저장.
-- Idempotent — Neon SQL editor 에서 직접 실행.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'success_cases' AND column_name = 'media_ids'
  ) THEN
    ALTER TABLE "success_cases"
      ADD COLUMN "media_ids" TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- 매체 ID 로 사례 역검색용 GIN 인덱스 (배열 contains 쿼리 가속)
CREATE INDEX IF NOT EXISTS "success_cases_media_ids_idx"
  ON "success_cases" USING GIN ("media_ids");
