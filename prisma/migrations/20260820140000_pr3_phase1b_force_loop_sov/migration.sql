-- Phase 1b — loop SOV override on FactSheet (bus/taxi misclassified as static)
ALTER TABLE "media_fact_sheets" ADD COLUMN "force_loop_sov" BOOLEAN;
