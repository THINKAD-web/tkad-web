-- 주변 시설 자동 수집용 (카카오 로컬 API 등)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "nearby_facilities" TEXT;
