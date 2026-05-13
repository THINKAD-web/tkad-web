-- 이동형 매체 구 단위 커버리지 (행정구역 5자리 코드 배열)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "coverage_district_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
