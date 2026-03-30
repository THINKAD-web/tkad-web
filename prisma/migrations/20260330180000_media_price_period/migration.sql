-- CreateEnum
CREATE TYPE "MediaPricePeriod" AS ENUM ('month', 'biweekly', 'week', 'day');

-- AlterTable
ALTER TABLE "media" ADD COLUMN "price_period" "MediaPricePeriod" NOT NULL DEFAULT 'month';
