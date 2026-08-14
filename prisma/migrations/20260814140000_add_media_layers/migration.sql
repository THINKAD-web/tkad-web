-- CreateEnum
CREATE TYPE "ReliabilityGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "DimensionSource" AS ENUM ('MEASURED', 'PARSED_FROM_TEXT', 'ESTIMATED_MEDIAN', 'UNKNOWN');

-- CreateTable
CREATE TABLE "media_fact_sheets" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "media_subtype" TEXT NOT NULL,
    "width_mm" INTEGER,
    "height_mm" INTEGER,
    "dimension_source" "DimensionSource",
    "install_height_m" DOUBLE PRECISION,
    "bearing" INTEGER,
    "view_distance_m" DOUBLE PRECISION,
    "operating_start" TEXT,
    "operating_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "station_code" TEXT,
    "station_line_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_fact_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_external_signals" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "raw_value" JSONB NOT NULL,
    "source_url" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_external_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_computed_metrics" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "daily_impressions" INTEGER NOT NULL,
    "hourly_impressions" JSONB,
    "cpm" INTEGER NOT NULL,
    "visibility_score" DOUBLE PRECISION,
    "reliability_grade" "ReliabilityGrade" NOT NULL,
    "model_version" TEXT NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "source_signal_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "legacy_daily_impressions" INTEGER,
    "legacy_cpm" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_computed_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_fact_sheets_media_id_key" ON "media_fact_sheets"("media_id");

-- CreateIndex
CREATE INDEX "media_fact_sheets_media_subtype_idx" ON "media_fact_sheets"("media_subtype");

-- CreateIndex
CREATE INDEX "media_fact_sheets_station_code_idx" ON "media_fact_sheets"("station_code");

-- CreateIndex
CREATE INDEX "media_external_signals_media_id_source_type_idx" ON "media_external_signals"("media_id", "source_type");

-- CreateIndex
CREATE INDEX "media_external_signals_source_type_collected_at_idx" ON "media_external_signals"("source_type", "collected_at");

-- CreateIndex
CREATE INDEX "media_external_signals_source_type_source_key_idx" ON "media_external_signals"("source_type", "source_key");

-- CreateIndex
CREATE UNIQUE INDEX "media_computed_metrics_media_id_key" ON "media_computed_metrics"("media_id");

-- CreateIndex
CREATE INDEX "media_computed_metrics_reliability_grade_idx" ON "media_computed_metrics"("reliability_grade");

-- CreateIndex
CREATE INDEX "media_computed_metrics_computed_at_idx" ON "media_computed_metrics"("computed_at");

-- AddForeignKey
ALTER TABLE "media_fact_sheets" ADD CONSTRAINT "media_fact_sheets_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_external_signals" ADD CONSTRAINT "media_external_signals_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_computed_metrics" ADD CONSTRAINT "media_computed_metrics_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
