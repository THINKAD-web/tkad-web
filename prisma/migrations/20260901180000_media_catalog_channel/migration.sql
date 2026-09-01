-- PR1a: add catalog_channel column (backfill via scripts/migrations/pr1a-catalog-channel-forward.sql)
ALTER TABLE "media" ADD COLUMN "catalog_channel" TEXT;

CREATE INDEX "media_catalog_channel_idx" ON "media"("catalog_channel");
