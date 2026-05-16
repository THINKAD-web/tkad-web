-- P3-03: Report tags + MEDIA category
ALTER TABLE reports ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ReportCategory' AND e.enumlabel = 'MEDIA'
  ) THEN
    ALTER TYPE "ReportCategory" ADD VALUE 'MEDIA';
  END IF;
END $$;
