-- CreateEnum
CREATE TYPE "ConversionEventType" AS ENUM ('visit', 'media_view', 'favorite', 'quote_request', 'contract');

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "referrer" TEXT,
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "type" "ConversionEventType" NOT NULL,
    "path" TEXT,
    "media_id" TEXT,
    "user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops_error_logs" (
    "id" TEXT NOT NULL,
    "tag" TEXT,
    "path" TEXT,
    "status" INTEGER NOT NULL DEFAULT 500,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "page_views_session_id_created_at_idx" ON "page_views"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "page_views_path_created_at_idx" ON "page_views"("path", "created_at" DESC);

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at" DESC);

-- CreateIndex
CREATE INDEX "conversion_events_type_created_at_idx" ON "conversion_events"("type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversion_events_media_id_type_created_at_idx" ON "conversion_events"("media_id", "type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversion_events_session_id_created_at_idx" ON "conversion_events"("session_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "conversion_events_created_at_idx" ON "conversion_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ops_error_logs_created_at_idx" ON "ops_error_logs"("created_at" DESC);
