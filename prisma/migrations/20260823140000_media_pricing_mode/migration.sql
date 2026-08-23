-- 협의가(quote_only) 매체 — 외벽광고 등 건별 견적 상품

CREATE TYPE "MediaPricingMode" AS ENUM ('fixed', 'quote_only');

ALTER TABLE "media"
ADD COLUMN "pricing_mode" "MediaPricingMode" NOT NULL DEFAULT 'fixed';

-- 활성 외벽광고 → quote_only (2026-08-23 기준 9건 클러스터)
UPDATE "media"
SET "pricing_mode" = 'quote_only'
WHERE "is_active" = true
  AND "media_sub_category" = 'wall_mural';
