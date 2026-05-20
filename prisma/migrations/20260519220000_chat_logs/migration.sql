-- CreateTable
CREATE TABLE "chat_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'ko',
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_logs_user_id_created_at_idx" ON "chat_logs"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "chat_logs" ADD CONSTRAINT "chat_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
