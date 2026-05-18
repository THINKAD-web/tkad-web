-- AI 캠페인 제안서 저장 (`SavedCampaignProposal`)
CREATE TABLE IF NOT EXISTS "saved_campaign_proposals" (
  "id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "user_email" TEXT,
  "brand_name" TEXT NOT NULL,
  "campaign_name" TEXT NOT NULL,
  "input_json" JSONB NOT NULL,
  "proposal_json" JSONB NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "saved_campaign_proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "saved_campaign_proposals_expires_at_idx"
  ON "saved_campaign_proposals"("expires_at");

CREATE INDEX IF NOT EXISTS "saved_campaign_proposals_user_email_idx"
  ON "saved_campaign_proposals"("user_email");
