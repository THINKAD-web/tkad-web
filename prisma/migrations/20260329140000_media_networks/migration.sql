-- AlterTable
ALTER TABLE "ooh_quotes" ADD COLUMN "network_selections" JSONB;

-- CreateTable
CREATE TABLE "media_networks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "price_per_unit" INTEGER,
    "price_package" INTEGER,
    "min_units" INTEGER NOT NULL DEFAULT 1,
    "total_locations" INTEGER NOT NULL,
    "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image" TEXT,
    "gallery_images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT,
    "package_options" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_networks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_network_locations" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_network_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_networks_is_active_type_idx" ON "media_networks"("is_active", "type");

-- CreateIndex
CREATE INDEX "media_network_locations_network_id_idx" ON "media_network_locations"("network_id");

-- AddForeignKey
ALTER TABLE "media_network_locations" ADD CONSTRAINT "media_network_locations_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "media_networks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
