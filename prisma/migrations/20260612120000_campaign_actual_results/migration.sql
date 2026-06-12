-- 캠페인 집행 후 실측 실적 (어드민·매체사 수기 입력)
ALTER TABLE "campaigns"
  ADD COLUMN "actual_impressions" INTEGER,
  ADD COLUMN "actual_reach" INTEGER,
  ADD COLUMN "actual_entered_at" TIMESTAMP(3),
  ADD COLUMN "actual_entered_by_id" TEXT,
  ADD COLUMN "actual_source" VARCHAR(16);
