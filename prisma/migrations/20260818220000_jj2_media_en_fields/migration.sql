-- JJ-2 — 매체 영문 번역 필드 (AI 초안 + admin 검수)
ALTER TABLE "media"
  ADD COLUMN IF NOT EXISTS "description_en" TEXT,
  ADD COLUMN IF NOT EXISTS "location_en" TEXT;

COMMENT ON COLUMN "media"."description_en" IS 'JJ-2: 영문 상세 설명 (AI 초안 또는 수동)';
COMMENT ON COLUMN "media"."location_en" IS 'JJ-2: 영문 위치 표기 (AI 초안 또는 수동)';
