-- Safe additive migration: new tables only (idempotent — safe if db push ran first).

-- CreateTable
CREATE TABLE IF NOT EXISTS "ab_events" (
    "id" TEXT NOT NULL,
    "test_key" TEXT NOT NULL DEFAULT 'hero_cta',
    "variant" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ab_test_configs" (
    "test_key" TEXT NOT NULL,
    "forced_variant" TEXT,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ab_test_configs_pkey" PRIMARY KEY ("test_key")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "web_vitals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT,
    "path" TEXT NOT NULL DEFAULT '/',
    "locale" TEXT,
    "navigation_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_vitals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ab_events_test_key_variant_event_idx" ON "ab_events"("test_key", "variant", "event");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ab_events_test_key_created_at_idx" ON "ab_events"("test_key", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "web_vitals_name_created_at_idx" ON "web_vitals"("name", "created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "web_vitals_created_at_idx" ON "web_vitals"("created_at" DESC);
