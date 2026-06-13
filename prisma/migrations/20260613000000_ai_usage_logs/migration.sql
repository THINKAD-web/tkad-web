-- AI 호출 통합 사용량 로그
CREATE TABLE "ai_usage_logs" (
  "id" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "input_tokens" INTEGER NOT NULL DEFAULT 0,
  "output_tokens" INTEGER NOT NULL DEFAULT 0,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ai_usage_logs_feature_idx" ON "ai_usage_logs"("feature");
CREATE INDEX "ai_usage_logs_created_at_idx" ON "ai_usage_logs"("created_at");
CREATE INDEX "ai_usage_logs_model_idx" ON "ai_usage_logs"("model");
