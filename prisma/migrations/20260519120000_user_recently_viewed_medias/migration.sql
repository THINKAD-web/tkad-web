-- CreateTable
CREATE TABLE "user_recently_viewed_medias" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "region" VARCHAR(64) NOT NULL,
    "thumbnail" VARCHAR(512),
    "price" INTEGER NOT NULL DEFAULT 0,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_recently_viewed_medias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_recently_viewed_medias_user_id_media_id_key" ON "user_recently_viewed_medias"("user_id", "media_id");

-- CreateIndex
CREATE INDEX "user_recently_viewed_medias_user_id_visited_at_idx" ON "user_recently_viewed_medias"("user_id", "visited_at" DESC);
