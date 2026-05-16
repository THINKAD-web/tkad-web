-- CreateEnum
CREATE TYPE "MediaPeriodStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'RESERVED');

-- CreateTable
CREATE TABLE "media_availability" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "MediaPeriodStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_availability_media_id_start_date_end_date_idx" ON "media_availability"("media_id", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "media_availability" ADD CONSTRAINT "media_availability_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
