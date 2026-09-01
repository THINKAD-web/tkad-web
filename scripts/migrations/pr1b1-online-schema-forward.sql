-- PR1b-1 forward: post-migrate verification (table exists, 0 rows)
-- Prisma migration creates media_online_spec; this script verifies counts only.
BEGIN;

DO $$
DECLARE
  spec_cnt int;
  online_media int;
  offline_media int;
  total_media int;
BEGIN
  SELECT COUNT(*) INTO total_media FROM media;
  SELECT COUNT(*) INTO offline_media FROM media WHERE catalog_channel = 'offline';
  SELECT COUNT(*) INTO online_media FROM media WHERE catalog_channel = 'online';
  SELECT COUNT(*) INTO spec_cnt FROM media_online_spec;

  IF online_media <> 0 THEN
    RAISE EXCEPTION 'PR1b-1 post-check: catalog_channel online=% (expected 0)', online_media;
  END IF;
  IF spec_cnt <> 0 THEN
    RAISE EXCEPTION 'PR1b-1 post-check: media_online_spec rows=% (expected 0)', spec_cnt;
  END IF;
  IF offline_media <> total_media THEN
    RAISE EXCEPTION 'PR1b-1 post-check: offline=% total=% (must match)', offline_media, total_media;
  END IF;

  RAISE NOTICE 'PR1b-1 post: total=%, offline=%, online=%, media_online_spec=%',
    total_media, offline_media, online_media, spec_cnt;
END $$;

COMMIT;
