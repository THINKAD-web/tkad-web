-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('TREND', 'REGION', 'GUIDE', 'CAMPAIGN');

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "thumbnail" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reports_slug_key" ON "reports"("slug");

CREATE INDEX "reports_published_category_published_at_idx" ON "reports"("published", "category", "published_at");
