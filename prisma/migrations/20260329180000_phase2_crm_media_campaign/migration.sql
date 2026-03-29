-- CreateEnum
CREATE TYPE "MediaAvailability" AS ENUM ('available', 'reserved', 'maintenance');

-- CreateEnum
CREATE TYPE "CrmTier" AS ENUM ('vip', 'standard', 'lead');

-- AlterEnum (append new campaign pipeline steps)
ALTER TYPE "CampaignStatus" ADD VALUE 'negotiation';
ALTER TYPE "CampaignStatus" ADD VALUE 'production';

-- AlterTable
ALTER TABLE "media" ADD COLUMN "availability" "MediaAvailability" NOT NULL DEFAULT 'available';

-- AlterTable
ALTER TABLE "crm_accounts" ADD COLUMN "tier" "CrmTier" NOT NULL DEFAULT 'standard';

-- CreateTable
CREATE TABLE "media_advertiser_executions" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "advertiser_name" TEXT NOT NULL,
    "campaign_label" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_advertiser_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_proof_photos" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_proof_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_advertiser_executions_media_id_idx" ON "media_advertiser_executions"("media_id");

-- CreateIndex
CREATE INDEX "campaign_proof_photos_campaign_id_idx" ON "campaign_proof_photos"("campaign_id");

-- AddForeignKey
ALTER TABLE "media_advertiser_executions" ADD CONSTRAINT "media_advertiser_executions_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_proof_photos" ADD CONSTRAINT "campaign_proof_photos_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
