-- P4-03: Advertiser self dashboard — link campaigns to User accounts
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "owner_user_id" TEXT;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "report_generated_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "campaigns_owner_user_id_idx" ON "campaigns"("owner_user_id");
CREATE INDEX IF NOT EXISTS "campaigns_client_email_idx" ON "campaigns"("client_email");

ALTER TABLE "campaigns"
  ADD CONSTRAINT "campaigns_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
