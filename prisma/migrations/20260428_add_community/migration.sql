-- ═══════════════════════════════════════════════════════════════════
--  THINKAD Community Phase 3a — DB Migration SQL
--  Generated 2026-04-28 from prisma/schema.prisma additions
--
--  실행 대상: Neon PostgreSQL (운영 또는 branch)
--  필요 권한: CREATE TABLE, CREATE INDEX, CREATE UNIQUE INDEX
--  영향 범위: community_* 4개 테이블 신설. 기존 테이블 변경 0건.
--  롤백 SQL: 파일 하단 참조.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. community_posts ────────────────────────────────────────────
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "author_name" VARCHAR(50) NOT NULL,
    "author_user_id" TEXT,
    "author_email" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "author_ip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_posts_category_status_created_at_idx"
    ON "community_posts"("category", "status", "created_at");
CREATE INDEX "community_posts_status_created_at_idx"
    ON "community_posts"("status", "created_at");
CREATE INDEX "community_posts_author_user_id_idx"
    ON "community_posts"("author_user_id");

-- ── 2. community_comments ─────────────────────────────────────────
CREATE TABLE "community_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author_name" VARCHAR(50) NOT NULL,
    "author_user_id" TEXT,
    "author_email" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "author_ip" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_comments_post_id_status_created_at_idx"
    ON "community_comments"("post_id", "status", "created_at");
CREATE INDEX "community_comments_author_user_id_idx"
    ON "community_comments"("author_user_id");

ALTER TABLE "community_comments"
    ADD CONSTRAINT "community_comments_post_id_fkey"
    FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. community_reports ──────────────────────────────────────────
CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporter_ip" TEXT,
    "reporter_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_reports_target_type_target_id_idx"
    ON "community_reports"("target_type", "target_id");
CREATE INDEX "community_reports_created_at_idx"
    ON "community_reports"("created_at");

-- ── 4. community_post_likes ───────────────────────────────────────
CREATE TABLE "community_post_likes" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_post_likes_post_id_user_id_key"
    ON "community_post_likes"("post_id", "user_id");
CREATE UNIQUE INDEX "community_post_likes_post_id_ip_hash_key"
    ON "community_post_likes"("post_id", "ip_hash");
CREATE INDEX "community_post_likes_post_id_idx"
    ON "community_post_likes"("post_id");

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
--  검증 쿼리 (위 BEGIN..COMMIT 후 별도 실행)
-- ═══════════════════════════════════════════════════════════════════

-- 4 테이블 모두 생성 확인:
-- SELECT tablename FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename LIKE 'community_%'
-- ORDER BY tablename;
-- → community_comments / community_post_likes / community_posts / community_reports 4개 나와야 함

-- 인덱스 확인:
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename LIKE 'community_%'
-- ORDER BY indexname;

-- ═══════════════════════════════════════════════════════════════════
--  롤백 SQL — 만약 위 마이그레이션 후 문제 발견 시
--  주의: 모든 community 데이터 삭제됨
-- ═══════════════════════════════════════════════════════════════════

-- BEGIN;
-- DROP TABLE IF EXISTS "community_post_likes";
-- DROP TABLE IF EXISTS "community_reports";
-- DROP TABLE IF EXISTS "community_comments";
-- DROP TABLE IF EXISTS "community_posts";
-- COMMIT;
