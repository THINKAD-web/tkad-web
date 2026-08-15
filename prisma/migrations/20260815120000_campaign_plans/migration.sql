-- CampaignPlan — 저장·공유 플랜 (30일 TTL, engineVersion 스냅샷).
--
-- 원본 #390 스키마에서 3계층 계약(#379)과 무관한 독립 테이블만 분리.
-- PR-3 재설계(docs/pr3-redesign.md) 와 별개로 먼저 머지된다.

CREATE TABLE IF NOT EXISTS "campaign_plans" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "share_token"    TEXT NOT NULL,
  "owner_id"       TEXT,
  "brief"          JSONB NOT NULL,
  "media_mix"      JSONB NOT NULL,
  "metrics"        JSONB NOT NULL,
  "engine_version" TEXT NOT NULL,
  "expires_at"     TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_plans_share_token_key" ON "campaign_plans"("share_token");
CREATE INDEX IF NOT EXISTS "campaign_plans_owner_id_idx"    ON "campaign_plans"("owner_id");
CREATE INDEX IF NOT EXISTS "campaign_plans_expires_at_idx"  ON "campaign_plans"("expires_at");

-- 소유자 정리 시 ON DELETE SET NULL — 삭제된 사용자의 저장 플랜은 유실되지 않는다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'campaign_plans_owner_id_fkey'
  ) THEN
    ALTER TABLE "campaign_plans"
      ADD CONSTRAINT "campaign_plans_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
