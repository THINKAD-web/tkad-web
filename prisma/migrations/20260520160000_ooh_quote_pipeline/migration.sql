-- OoH quote pipeline: inquiry link, breakdown, validity, expired status
DO $$ BEGIN
  ALTER TYPE "OoHQuoteStatus" ADD VALUE 'expired';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "contact_inquiry_id" TEXT;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "quote_breakdown" JSONB;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "valid_until" TIMESTAMP(3);
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "discount_rate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "expiry_notice_sent_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "ooh_quotes_contact_inquiry_id_key"
  ON "ooh_quotes"("contact_inquiry_id");

CREATE INDEX IF NOT EXISTS "ooh_quotes_valid_until_status_idx"
  ON "ooh_quotes"("valid_until", "status");

ALTER TABLE "ooh_quotes"
  ADD CONSTRAINT "ooh_quotes_contact_inquiry_id_fkey"
  FOREIGN KEY ("contact_inquiry_id") REFERENCES "contact_inquiries"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
