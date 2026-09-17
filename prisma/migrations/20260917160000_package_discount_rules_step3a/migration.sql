-- STEP3a: 패키지 할인 규칙 테이블 + OoHQuote 스냅샷 필드 (additive only)
CREATE TABLE "package_discount_rules" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "label_ko" TEXT NOT NULL,
    "label_en" TEXT,
    "min_media_count" INTEGER,
    "max_media_count" INTEGER,
    "min_supply_won" INTEGER,
    "max_supply_won" INTEGER,
    "discount_percent" DOUBLE PRECISION NOT NULL,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3),
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_discount_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "package_discount_rules_active_priority_idx" ON "package_discount_rules"("active", "priority");

ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "package_discount_rule_id" TEXT;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "package_discount_percent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "package_discount_won" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ooh_quotes" ADD COLUMN IF NOT EXISTS "package_discount_source" TEXT NOT NULL DEFAULT 'none';

DO $$ BEGIN
 ALTER TABLE "ooh_quotes" ADD CONSTRAINT "ooh_quotes_package_discount_rule_id_fkey" FOREIGN KEY ("package_discount_rule_id") REFERENCES "package_discount_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
