-- CreateTable
CREATE TABLE "plan_report_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" VARCHAR(32) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "format" VARCHAR(16),
    "media_count" INTEGER NOT NULL DEFAULT 0,
    "goal_title" VARCHAR(120),
    "regions_text" VARCHAR(500),
    "report_title" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_report_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_report_activities_user_id_created_at_idx" ON "plan_report_activities"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "plan_report_activities_event_type_idx" ON "plan_report_activities"("event_type");

-- CreateIndex
CREATE INDEX "plan_report_activities_source_idx" ON "plan_report_activities"("source");

-- AddForeignKey
ALTER TABLE "plan_report_activities" ADD CONSTRAINT "plan_report_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
