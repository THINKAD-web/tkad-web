-- 어드민 수동 즉시 예약 on/off
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "instant_booking_enabled" BOOLEAN NOT NULL DEFAULT false;

-- 기존 자동 규칙(디지털·예약가능·월 500만 이하)에 해당하던 매체는 켜 둠
UPDATE "media" SET "instant_booking_enabled" = true
WHERE "type" = 'digital'
  AND "availability" = 'available'
  AND (
    ("price_period" = 'month' AND "price" <= 5000000)
    OR ("price_period" = 'day' AND "price" * 30 <= 5000000)
    OR ("price_period" = 'week' AND "price" * 4 <= 5000000)
    OR ("price_period" = 'biweekly' AND "price" * 2 <= 5000000)
  );
