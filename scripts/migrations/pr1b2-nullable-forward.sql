-- PR1b-2 forward: post-migrate verification (0 online rows expected)
BEGIN;

DO $$
DECLARE
  total_media int;
  offline_media int;
  online_media int;
  offline_null_type int;
  offline_null_price int;
  online_with_type int;
  online_with_price int;
BEGIN
  SELECT COUNT(*) INTO total_media FROM media;
  SELECT COUNT(*) INTO offline_media FROM media WHERE catalog_channel = 'offline';
  SELECT COUNT(*) INTO online_media FROM media WHERE catalog_channel = 'online';
  SELECT COUNT(*) INTO offline_null_type FROM media
    WHERE catalog_channel = 'offline' AND type IS NULL;
  SELECT COUNT(*) INTO offline_null_price FROM media
    WHERE catalog_channel = 'offline' AND price IS NULL;
  SELECT COUNT(*) INTO online_with_type FROM media
    WHERE catalog_channel = 'online' AND type IS NOT NULL;
  SELECT COUNT(*) INTO online_with_price FROM media
    WHERE catalog_channel = 'online' AND price IS NOT NULL;

  IF offline_null_type > 0 THEN
    RAISE EXCEPTION 'PR1b-2 post-check: offline with NULL type=%', offline_null_type;
  END IF;
  IF offline_null_price > 0 THEN
    RAISE EXCEPTION 'PR1b-2 post-check: offline with NULL price=%', offline_null_price;
  END IF;
  IF online_with_type > 0 THEN
    RAISE EXCEPTION 'PR1b-2 post-check: online with non-null type=%', online_with_type;
  END IF;
  IF online_with_price > 0 THEN
    RAISE EXCEPTION 'PR1b-2 post-check: online with non-null price=%', online_with_price;
  END IF;
  IF offline_media + online_media <> total_media THEN
    RAISE EXCEPTION 'PR1b-2 post-check: channel sum mismatch total=% offline=% online=%',
      total_media, offline_media, online_media;
  END IF;

  RAISE NOTICE 'PR1b-2 post: total=%, offline=%, online=%, offline_null_type=%, offline_null_price=%',
    total_media, offline_media, online_media, offline_null_type, offline_null_price;
END $$;

COMMIT;
