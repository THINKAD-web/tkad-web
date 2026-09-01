-- PR1b-1 rollback: drop media_online_spec (no media rows reference it at PR1b-1)
BEGIN;

DROP TABLE IF EXISTS media_online_spec;

DO $$
DECLARE
  spec_cnt int;
  online_cnt int;
BEGIN
  SELECT COUNT(*) INTO spec_cnt FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'media_online_spec';
  IF spec_cnt > 0 THEN
    RAISE EXCEPTION 'PR1b-1 rollback: media_online_spec still exists';
  END IF;
  SELECT COUNT(*) INTO online_cnt FROM media WHERE catalog_channel = 'online';
  IF online_cnt <> 0 THEN
    RAISE EXCEPTION 'PR1b-1 rollback: catalog_channel online=% (expected 0)', online_cnt;
  END IF;
  RAISE NOTICE 'PR1b-1 rollback OK: media_online_spec dropped, online=%', online_cnt;
END $$;

COMMIT;
