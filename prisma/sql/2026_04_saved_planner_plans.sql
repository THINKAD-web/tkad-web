-- 공개 플래너 저장·공유 (`SavedPlannerPlan`) 테이블 생성
-- Idempotent — 이미 존재하면 skip. Neon SQL editor 에서 직접 실행 권장.

CREATE TABLE IF NOT EXISTS "saved_planner_plans" (
  "id"         TEXT PRIMARY KEY,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "user_email" TEXT,
  "plan_json"  JSONB NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "saved_planner_plans_expires_at_idx"
  ON "saved_planner_plans"("expires_at");

-- updated_at 자동 갱신 트리거 (다른 테이블과 동일 패턴)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'saved_planner_plans_updated_at'
  ) THEN
    CREATE TRIGGER saved_planner_plans_updated_at
      BEFORE UPDATE ON "saved_planner_plans"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- update_updated_at_column 함수가 없을 수 있음 — Prisma @updatedAt 만으로도 충분
  NULL;
END $$;
