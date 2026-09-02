-- PR1b-2 rollback: drop CHECK constraints, restore NOT NULL (fails if nulls exist)
BEGIN;

ALTER TABLE media DROP CONSTRAINT IF EXISTS media_online_type_null;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_offline_type_not_null;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_online_price_null;
ALTER TABLE media DROP CONSTRAINT IF EXISTS media_offline_price_not_null;

ALTER TABLE media ALTER COLUMN type SET NOT NULL;
ALTER TABLE media ALTER COLUMN price SET NOT NULL;

COMMIT;
