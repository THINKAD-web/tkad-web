-- 멤버 디렉터리·프로필용 지역 (서울/부산/대구/기타 필터 등)
-- IF NOT EXISTS: db push 등으로 컬럼이 이미 있을 때 migrate deploy 재시도 가능
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "region" TEXT;
