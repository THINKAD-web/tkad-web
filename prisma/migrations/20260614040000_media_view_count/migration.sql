-- 매체 누적 상세 조회수 (인기 폴백 정렬용)
ALTER TABLE "media" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "media_is_active_view_count_idx" ON "media"("is_active", "view_count" DESC);
