-- CreateTable
CREATE TABLE "admin_campaign_builder_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'digital',
    "payload" JSONB NOT NULL,
    "created_by_admin" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_campaign_builder_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_campaign_builder_reports_created_by_admin_updated_at_idx" ON "admin_campaign_builder_reports"("created_by_admin", "updated_at");
