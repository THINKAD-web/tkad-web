-- #224 P1: OoH 견적 ↔ MediaBooking 홀드 연결 (nullable, 기존 행 영향 없음)
ALTER TABLE "media_bookings" ADD COLUMN IF NOT EXISTS "ooh_quote_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_bookings_ooh_quote_id_fkey'
  ) THEN
    ALTER TABLE "media_bookings"
      ADD CONSTRAINT "media_bookings_ooh_quote_id_fkey"
      FOREIGN KEY ("ooh_quote_id") REFERENCES "ooh_quotes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "media_bookings_media_id_ooh_quote_id_idx"
  ON "media_bookings"("media_id", "ooh_quote_id");

CREATE INDEX IF NOT EXISTS "media_bookings_ooh_quote_id_idx"
  ON "media_bookings"("ooh_quote_id");
