-- P1: 고객 견적 수정 요청 (sent 상태, enum 변경 없음)
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "revision_message" TEXT;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "revision_requested_at" TIMESTAMP(3);
