-- CreateTable
CREATE TABLE "chatbot_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT,
    "user_email" TEXT,
    "role" VARCHAR(16) NOT NULL,
    "message" TEXT NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "page_url" TEXT,
    "tokens_used" INTEGER,
    "model" TEXT,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'ko',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatbot_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chatbot_logs_session_id_created_at_idx" ON "chatbot_logs"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "chatbot_logs_created_at_idx" ON "chatbot_logs"("created_at");

-- CreateIndex
CREATE INDEX "chatbot_logs_user_id_idx" ON "chatbot_logs"("user_id");
