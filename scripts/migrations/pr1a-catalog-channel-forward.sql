-- PR1a forward: catalog_channel backfill + NULL-main classification (4 rows)
-- Run in ONE transaction with prisma column migration already applied.
-- Rollback: scripts/migrations/pr1a-catalog-channel-rollback.sql
--
-- Original NULL-main rows (rollback restores NULL — not overwrite):
--   cmr9xedzi000a04layhba2ulc  main=NULL sub=NULL  → transit / vehicle_wrap
--   cmrap3eo4000004jv8b2tt90v  main=NULL sub=NULL  → ooh / digital_signage
--   cmrn711g8000404ib3hct4qpy  main=NULL sub=NULL  → ooh / digital_signage
--   cmtd4wpic000004ic5oeqzdxq  main=NULL sub=NULL  → transit / subway_station

BEGIN;

DO $$
DECLARE
  total_media int;
  pre_offline int;
  pre_online int;
  pre_null int;
  null_main int;
BEGIN
  SELECT COUNT(*) INTO total_media FROM media;
  SELECT COUNT(*) INTO pre_offline FROM media WHERE catalog_channel = 'offline';
  SELECT COUNT(*) INTO pre_online FROM media WHERE catalog_channel = 'online';
  SELECT COUNT(*) INTO pre_null FROM media WHERE catalog_channel IS NULL;
  SELECT COUNT(*) INTO null_main FROM media WHERE media_main_category IS NULL;
  RAISE NOTICE 'PR1a pre: total=%, catalog_channel offline=%, online=%, null=%, null_main=%',
    total_media, pre_offline, pre_online, pre_null, null_main;
END $$;

-- §3.2 Classification assignment (NULL → structured; was empty, not overwrite)
UPDATE media SET
  media_main_category = 'transit',
  media_sub_category = 'vehicle_wrap'
WHERE id = 'cmr9xedzi000a04layhba2ulc';

UPDATE media SET
  media_main_category = 'ooh',
  media_sub_category = 'digital_signage'
WHERE id IN (
  'cmrap3eo4000004jv8b2tt90v',
  'cmrn711g8000404ib3hct4qpy'
);

UPDATE media SET
  media_main_category = 'transit',
  media_sub_category = 'subway_station'
WHERE id = 'cmtd4wpic000004ic5oeqzdxq';

-- §3.1 Explicit map — positive matches only (no NOT-online fallback)
UPDATE media SET catalog_channel = 'offline'
WHERE media_main_category IN (
  'ooh', 'transit', 'shopping', 'shelter', 'entertainment',
  'lifestyle', 'culture', 'etc', 'building', 'education', 'network'
);

UPDATE media SET catalog_channel = 'online'
WHERE media_main_category IN (
  'search', 'display', 'video', 'sns', 'message', 'local'
);

DO $$
DECLARE
  unmapped int;
  bad_main text;
BEGIN
  SELECT COUNT(*) INTO unmapped
  FROM media
  WHERE catalog_channel IS NULL AND media_main_category IS NOT NULL;

  IF unmapped > 0 THEN
    SELECT string_agg(DISTINCT media_main_category, ', ') INTO bad_main
    FROM media
    WHERE catalog_channel IS NULL AND media_main_category IS NOT NULL;
    RAISE EXCEPTION 'PR1a backfill: % rows with unmapped media_main_category: %', unmapped, bad_main;
  END IF;

  SELECT COUNT(*) INTO unmapped FROM media WHERE catalog_channel IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'PR1a backfill: % rows still catalog_channel IS NULL (check NULL main per-row map)', unmapped;
  END IF;
END $$;

ALTER TABLE media ALTER COLUMN catalog_channel SET NOT NULL;

DO $$
DECLARE
  total_media int;
  offline_cnt int;
  online_cnt int;
  null_cnt int;
BEGIN
  SELECT COUNT(*) INTO total_media FROM media;
  SELECT COUNT(*) INTO offline_cnt FROM media WHERE catalog_channel = 'offline';
  SELECT COUNT(*) INTO online_cnt FROM media WHERE catalog_channel = 'online';
  SELECT COUNT(*) INTO null_cnt FROM media WHERE catalog_channel IS NULL;

  IF null_cnt > 0 THEN
    RAISE EXCEPTION 'PR1a post-check: catalog_channel NULL=%', null_cnt;
  END IF;
  IF online_cnt <> 0 THEN
    RAISE EXCEPTION 'PR1a post-check: catalog_channel online=% (expected 0)', online_cnt;
  END IF;
  IF offline_cnt <> total_media THEN
    RAISE EXCEPTION 'PR1a post-check: offline=% total=% (must match)', offline_cnt, total_media;
  END IF;

  RAISE NOTICE 'PR1a post: total=%, offline=%, online=%, null=%',
    total_media, offline_cnt, online_cnt, null_cnt;
END $$;

COMMIT;
