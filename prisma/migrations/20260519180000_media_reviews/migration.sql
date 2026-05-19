-- CreateEnum
CREATE TYPE "MediaReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REQUEST';

-- CreateTable
CREATE TABLE "media_reviews" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" TEXT NOT NULL,
    "campaign_period" VARCHAR(80),
    "industry" VARCHAR(60),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" "MediaReviewStatus" NOT NULL DEFAULT 'PENDING',
    "campaign_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_review_helpfuls" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_review_helpfuls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_reviews_media_id_user_id_key" ON "media_reviews"("media_id", "user_id");

-- CreateIndex
CREATE INDEX "media_reviews_media_id_status_idx" ON "media_reviews"("media_id", "status");

-- CreateIndex
CREATE INDEX "media_reviews_status_created_at_idx" ON "media_reviews"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "media_review_helpfuls_review_id_user_id_key" ON "media_review_helpfuls"("review_id", "user_id");

-- AddForeignKey
ALTER TABLE "media_reviews" ADD CONSTRAINT "media_reviews_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_reviews" ADD CONSTRAINT "media_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_reviews" ADD CONSTRAINT "media_reviews_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_review_helpfuls" ADD CONSTRAINT "media_review_helpfuls_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "media_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_review_helpfuls" ADD CONSTRAINT "media_review_helpfuls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
