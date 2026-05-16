-- P4-01: Media owner self-registration applications
CREATE TYPE "MediaApplicationStatus" AS ENUM (
  'PENDING',
  'REVIEWING',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE IF NOT EXISTS media_applications (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  media_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  address TEXT NOT NULL,
  address_detail TEXT,
  zonecode TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  district TEXT,
  width_cm INTEGER,
  height_cm INTEGER,
  is_digital BOOLEAN NOT NULL DEFAULT false,
  operating_hours TEXT,
  has_lighting BOOLEAN NOT NULL DEFAULT false,
  daily_footfall INTEGER,
  monthly_price INTEGER NOT NULL,
  min_flight_days INTEGER,
  photo_front_url TEXT NOT NULL,
  photo_side_url TEXT NOT NULL,
  photo_night_url TEXT NOT NULL,
  notes TEXT,
  status "MediaApplicationStatus" NOT NULL DEFAULT 'PENDING',
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_media_id TEXT,
  submitter_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_applications_status_created_idx
  ON media_applications (status, created_at DESC);
