-- 협의가(quote_only) 매체 — 외벽광고 중 무단가(협의) 상품만
--
-- 주의: media_sub_category = wall_mural 전체(45건)가 아니라
-- price≤0 이고 price_options 에 양수 단가가 없는 9건만 대상.
-- (2026-08-23 프로덕션 카탈로그 검증 — isQuoteOnlyMedia 레거시 폴백과 동일)

CREATE TYPE "MediaPricingMode" AS ENUM ('fixed', 'quote_only');

ALTER TABLE "media"
ADD COLUMN "pricing_mode" "MediaPricingMode" NOT NULL DEFAULT 'fixed';

UPDATE "media"
SET "pricing_mode" = 'quote_only'
WHERE "is_active" = true
  AND "media_sub_category" = 'wall_mural'
  AND COALESCE("price", 0) <= 0
  AND NOT (
    "price_options" IS NOT NULL
    AND jsonb_typeof("price_options"::jsonb) = 'array'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements("price_options"::jsonb) AS opt
      WHERE COALESCE((opt->>'price')::numeric, 0) > 0
    )
  );
