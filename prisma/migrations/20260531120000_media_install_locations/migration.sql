-- 복수 설치 지점 (휴게소 상·하행 등)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "install_locations" JSONB;
