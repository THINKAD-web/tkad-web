-- PR1a rollback: catalog_channel + restore NULL-main classification (4 rows)
-- Original values were NULL — see forward script header.

BEGIN;

ALTER TABLE media ALTER COLUMN catalog_channel DROP NOT NULL;

UPDATE media SET catalog_channel = NULL;

UPDATE media SET
  media_main_category = NULL,
  media_sub_category = NULL
WHERE id IN (
  'cmr9xedzi000a04layhba2ulc',
  'cmrap3eo4000004jv8b2tt90v',
  'cmrn711g8000404ib3hct4qpy',
  'cmtd4wpic000004ic5oeqzdxq'
);

DO $$
DECLARE
  still_set int;
BEGIN
  SELECT COUNT(*) INTO still_set FROM media WHERE catalog_channel IS NOT NULL;
  IF still_set > 0 THEN
    RAISE EXCEPTION 'PR1a rollback: % rows still have catalog_channel set', still_set;
  END IF;

  SELECT COUNT(*) INTO still_set FROM media
  WHERE id IN (
    'cmr9xedzi000a04layhba2ulc',
    'cmrap3eo4000004jv8b2tt90v',
    'cmrn711g8000404ib3hct4qpy',
    'cmtd4wpic000004ic5oeqzdxq'
  )
  AND (media_main_category IS NOT NULL OR media_sub_category IS NOT NULL);

  IF still_set > 0 THEN
    RAISE EXCEPTION 'PR1a rollback: % classification rows not restored to NULL', still_set;
  END IF;

  RAISE NOTICE 'PR1a rollback OK: catalog_channel cleared, 4 rows main/sub NULL';
END $$;

COMMIT;
