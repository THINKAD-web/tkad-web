-- CreateTable
CREATE TABLE "recommendation_pattern_stats" (
    "id" TEXT NOT NULL,
    "combo_key" VARCHAR(128) NOT NULL,
    "industry" VARCHAR(32) NOT NULL,
    "target" VARCHAR(32) NOT NULL,
    "budget_bucket" VARCHAR(32) NOT NULL,
    "goal" VARCHAR(32) NOT NULL,
    "source" VARCHAR(16) NOT NULL,
    "count" INTEGER NOT NULL,
    "top_media_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_pattern_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_pattern_stats_combo_key_key" ON "recommendation_pattern_stats"("combo_key");

-- CreateIndex
CREATE INDEX "recommendation_pattern_stats_source_industry_goal_idx" ON "recommendation_pattern_stats"("source", "industry", "goal");

-- CreateIndex
CREATE INDEX "recommendation_pattern_stats_refreshed_at_idx" ON "recommendation_pattern_stats"("refreshed_at" DESC);
