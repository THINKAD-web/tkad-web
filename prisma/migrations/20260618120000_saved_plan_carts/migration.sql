-- CreateTable
CREATE TABLE "saved_plan_carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "source" VARCHAR(32) NOT NULL DEFAULT 'plan_cart',
    "items" JSONB NOT NULL DEFAULT '[]',
    "campaign_goal" VARCHAR(32),
    "total_budget" INTEGER,
    "duration" INTEGER,
    "report_summary" JSONB,
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "regions_text" VARCHAR(500),
    "goal_title" VARCHAR(120),
    "status" VARCHAR(32) NOT NULL DEFAULT 'saved',
    "publish_intent" VARCHAR(32),
    "admin_note" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_plan_carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_plan_carts_user_id_deleted_at_created_at_idx" ON "saved_plan_carts"("user_id", "deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "saved_plan_carts_status_idx" ON "saved_plan_carts"("status");

-- CreateIndex
CREATE INDEX "saved_plan_carts_publish_intent_idx" ON "saved_plan_carts"("publish_intent");

-- AddForeignKey
ALTER TABLE "saved_plan_carts" ADD CONSTRAINT "saved_plan_carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
