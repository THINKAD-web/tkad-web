-- Ops automation: inquiry routing, welcome drip, support chat logs, outreach follow-ups

ALTER TABLE "contact_inquiries" ADD COLUMN IF NOT EXISTS "category_code" VARCHAR(64);
ALTER TABLE "contact_inquiries" ADD COLUMN IF NOT EXISTS "assignee_email" VARCHAR(254);
ALTER TABLE "contact_inquiries" ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMP(3);
ALTER TABLE "contact_inquiries" ADD COLUMN IF NOT EXISTS "first_response_at" TIMESTAMP(3);
ALTER TABLE "contact_inquiries" ADD COLUMN IF NOT EXISTS "sla_escalated_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "contact_inquiries_assignee_email_created_at_idx"
  ON "contact_inquiries"("assignee_email", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "contact_inquiries_first_response_sla_idx"
  ON "contact_inquiries"("first_response_at", "sla_escalated_at");

CREATE TABLE IF NOT EXISTS "user_welcome_drips" (
    "user_id" TEXT NOT NULL,
    "day0_sent_at" TIMESTAMP(3),
    "day1_sent_at" TIMESTAMP(3),
    "day3_sent_at" TIMESTAMP(3),
    "day7_sent_at" TIMESTAMP(3),
    "day14_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_welcome_drips_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "user_welcome_drips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "support_chat_logs" (
    "id" TEXT NOT NULL,
    "session_id" VARCHAR(64) NOT NULL,
    "user_id" TEXT,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'ko',
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_chat_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "support_chat_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_chat_logs_session_id_created_at_idx"
  ON "support_chat_logs"("session_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "support_chat_logs_created_at_idx"
  ON "support_chat_logs"("created_at" DESC);

CREATE TABLE IF NOT EXISTS "ops_automation_state" (
    "key" VARCHAR(64) NOT NULL,
    "int_value" INTEGER NOT NULL DEFAULT 0,
    "json_value" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ops_automation_state_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "potential_media" ADD COLUMN IF NOT EXISTS "outreach_sequence_step" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "potential_media" ADD COLUMN IF NOT EXISTS "follow_up1_sent_at" TIMESTAMP(3);
ALTER TABLE "potential_media" ADD COLUMN IF NOT EXISTS "follow_up2_sent_at" TIMESTAMP(3);
