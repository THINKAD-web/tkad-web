-- Repair: wall_mural 중 무단가 9건만 quote_only (구 broad 백필·수동 오설정 복구)
--
-- Idempotent — 이미 올바른 DB 에서도 동일 종료 상태.

UPDATE "media"
SET "pricing_mode" = 'fixed'
WHERE "media_sub_category" = 'wall_mural';

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
