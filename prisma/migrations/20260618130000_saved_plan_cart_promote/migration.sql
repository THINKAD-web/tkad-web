-- AlterTable
ALTER TABLE "saved_plan_carts"
ADD COLUMN "promoted_success_case_id" TEXT,
ADD COLUMN "promoted_community_post_id" TEXT,
ADD COLUMN "promoted_at" TIMESTAMP(3),
ADD COLUMN "restore_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "last_restored_at" TIMESTAMP(3);
