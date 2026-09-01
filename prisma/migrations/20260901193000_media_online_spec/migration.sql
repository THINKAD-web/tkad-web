-- CreateTable
CREATE TABLE "media_online_spec" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "min_budget" INTEGER NOT NULL,
    "cpc_min" INTEGER,
    "cpc_max" INTEGER,
    "cpm_min" INTEGER,
    "cpm_max" INTEGER,
    "targeting_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kpi_hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "best_for" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_online_spec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_online_spec_media_id_key" ON "media_online_spec"("media_id");

-- AddForeignKey
ALTER TABLE "media_online_spec" ADD CONSTRAINT "media_online_spec_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
