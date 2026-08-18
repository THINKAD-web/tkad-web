-- U-series: 매체 국가 코드 (ISO 3166-1 alpha-2, 기본 KR)
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'KR';

CREATE INDEX IF NOT EXISTS "media_country_idx" ON "media"("country");
