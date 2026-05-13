CREATE TYPE "CommunityMemberRole" AS ENUM ('ADVERTISER', 'MEDIA', 'AGENCY', 'FREELANCER');

ALTER TABLE "users"
ADD COLUMN "community_role" "CommunityMemberRole",
ADD COLUMN "community_bio" TEXT;

UPDATE "users"
SET "community_role" = CASE "role"
  WHEN 'advertiser' THEN 'ADVERTISER'::"CommunityMemberRole"
  WHEN 'agency' THEN 'AGENCY'::"CommunityMemberRole"
  WHEN 'owner' THEN 'MEDIA'::"CommunityMemberRole"
  ELSE 'FREELANCER'::"CommunityMemberRole"
END
WHERE "community_role" IS NULL;

UPDATE "community_posts"
SET "category" = CASE
  WHEN "category" = 'qa' THEN 'qna'
  WHEN "category" = 'recommend' THEN 'networking'
  ELSE "category"
END;

ALTER TABLE "community_posts"
ADD CONSTRAINT "community_posts_author_user_id_fkey"
FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_comments"
ADD CONSTRAINT "community_comments_author_user_id_fkey"
FOREIGN KEY ("author_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "community_post_likes"
ADD CONSTRAINT "community_post_likes_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "community_post_likes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "community_bookmarks" (
  "id" TEXT NOT NULL,
  "post_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "post_bookmark_user_unique"
ON "community_bookmarks"("post_id", "user_id");

CREATE INDEX "community_bookmarks_post_id_idx"
ON "community_bookmarks"("post_id");

CREATE INDEX "community_bookmarks_user_id_idx"
ON "community_bookmarks"("user_id");

ALTER TABLE "community_bookmarks"
ADD CONSTRAINT "community_bookmarks_post_id_fkey"
FOREIGN KEY ("post_id") REFERENCES "community_posts"("id")
ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "community_bookmarks_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
