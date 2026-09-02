-- PR1b-2: nullable Media.type / Media.price + catalog_channel invariants
-- Prod pre-state: 889 offline rows, all with type + price NOT NULL

ALTER TABLE "media" ALTER COLUMN "type" DROP NOT NULL;
ALTER TABLE "media" ALTER COLUMN "price" DROP NOT NULL;

ALTER TABLE "media" ADD CONSTRAINT "media_online_type_null"
  CHECK ("catalog_channel" IS DISTINCT FROM 'online' OR "type" IS NULL);

ALTER TABLE "media" ADD CONSTRAINT "media_offline_type_not_null"
  CHECK ("catalog_channel" IS DISTINCT FROM 'offline' OR "type" IS NOT NULL);

ALTER TABLE "media" ADD CONSTRAINT "media_online_price_null"
  CHECK ("catalog_channel" IS DISTINCT FROM 'online' OR "price" IS NULL);

ALTER TABLE "media" ADD CONSTRAINT "media_offline_price_not_null"
  CHECK ("catalog_channel" IS DISTINCT FROM 'offline' OR "price" IS NOT NULL);
