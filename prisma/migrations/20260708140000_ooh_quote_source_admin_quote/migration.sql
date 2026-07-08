-- Additive: admin formal Quote → OoHQuote contract pipeline bridge (P1)
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "source_admin_quote_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ooh_quotes_source_admin_quote_id_key"
  ON "ooh_quotes"("source_admin_quote_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ooh_quotes_source_admin_quote_id_fkey'
  ) THEN
    ALTER TABLE "ooh_quotes"
      ADD CONSTRAINT "ooh_quotes_source_admin_quote_id_fkey"
      FOREIGN KEY ("source_admin_quote_id") REFERENCES "quotes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
