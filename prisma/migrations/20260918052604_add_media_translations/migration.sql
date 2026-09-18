-- PR1(다국어 확장, Option C): ja/zh 번역 저장용 신규 테이블 (additive only, 기존 컬럼 변경 없음)
CREATE TABLE "media_translations" (
    "id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "location" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_translations_locale_idx" ON "media_translations"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "media_translations_media_id_locale_key" ON "media_translations"("media_id", "locale");

-- AddForeignKey
ALTER TABLE "media_translations" ADD CONSTRAINT "media_translations_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
