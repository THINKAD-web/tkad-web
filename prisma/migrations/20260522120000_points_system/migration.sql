-- CreateEnum
CREATE TYPE "PointEventType" AS ENUM ('SIGNUP', 'REVIEW_WRITE', 'REVIEW_HELPFUL', 'COMMUNITY_POST', 'COMMUNITY_COMMENT', 'REFERRAL', 'MEDIA_REGISTER', 'INQUIRY_SUBMIT', 'DAILY_CHECK', 'PLANNER_COMPLETE', 'REDEEM_PRO_DAY', 'REDEEM_PRO_WEEK', 'REDEEM_PRO_MONTH', 'REDEEM_REPORT', 'REDEEM_MEDIA_DETAIL', 'ADMIN_ADJUST', 'EXPIRED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "referred_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "user_points" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_spent" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "PointEventType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "ref_id" VARCHAR(64),
    "balance_after" INTEGER,
    "expires_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_point_credits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credit_type" VARCHAR(32) NOT NULL,
    "remaining_uses" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_point_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_points_user_id_key" ON "user_points"("user_id");

-- CreateIndex
CREATE INDEX "users_referred_by_user_id_idx" ON "users"("referred_by_user_id");

-- CreateIndex
CREATE INDEX "point_transactions_user_id_created_at_idx" ON "point_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "point_transactions_expires_at_expired_at_idx" ON "point_transactions"("expires_at", "expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "point_transactions_user_id_type_ref_id_key" ON "point_transactions"("user_id", "type", "ref_id");

-- CreateIndex
CREATE INDEX "user_point_credits_user_id_credit_type_idx" ON "user_point_credits"("user_id", "credit_type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_transactions" ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_point_credits" ADD CONSTRAINT "user_point_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
