-- Instant DOOH booking + payment logs (P4-02)
-- Run after deploying schema via prisma db push / migrate

CREATE TYPE "InstantBookingStatus" AS ENUM (
  'draft',
  'payment_pending',
  'paid',
  'confirmed',
  'cancelled',
  'failed'
);

CREATE TYPE "PaymentProvider" AS ENUM ('toss', 'portone');

CREATE TYPE "PaymentLogStatus" AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'cancelled'
);

CREATE TABLE "bookings" (
  "id" TEXT NOT NULL,
  "media_id" TEXT NOT NULL,
  "user_id" TEXT,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "creative_url" TEXT NOT NULL,
  "creative_type" VARCHAR(20),
  "amount" INTEGER NOT NULL,
  "status" "InstantBookingStatus" NOT NULL DEFAULT 'draft',
  "payment_id" TEXT,
  "order_id" TEXT NOT NULL,
  "contact_name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "contact_phone" TEXT,
  "media_booking_id" TEXT,
  "execution_confirmed_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bookings_order_id_key" ON "bookings"("order_id");
CREATE UNIQUE INDEX "bookings_media_booking_id_key" ON "bookings"("media_booking_id");
CREATE INDEX "bookings_media_id_status_idx" ON "bookings"("media_id", "status");
CREATE INDEX "bookings_status_created_at_idx" ON "bookings"("status", "created_at");

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_media_id_fkey"
  FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_logs" (
  "id" TEXT NOT NULL,
  "booking_id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PaymentLogStatus" NOT NULL,
  "raw" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_logs_booking_id_idx" ON "payment_logs"("booking_id");

ALTER TABLE "payment_logs"
  ADD CONSTRAINT "payment_logs_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
