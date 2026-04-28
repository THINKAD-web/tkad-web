/**
 * Community DB queries — server-only.
 *
 * Prisma 직접 import 모두 여기로 격리. UI / API 라우트는 이 모듈만 import.
 */

import { getPrisma } from "@/lib/prisma";
import {
  COMMUNITY_LIMITS,
  type CommunityCategory,
  type CommunityCommentItem,
  type CommunityPostDetail,
  type CommunityPostListItem,
} from "@/lib/community/types";

function excerpt(body: string): string {
  const trimmed = body.replace(/\s+/g, " ").trim();
  if (trimmed.length <= COMMUNITY_LIMITS.EXCERPT_LEN) return trimmed;
  return trimmed.slice(0, COMMUNITY_LIMITS.EXCERPT_LEN) + "…";
}

function isCategory(s: unknown): s is CommunityCategory {
  return s === "qa" || s === "review" || s === "recommend";
}

export type ListPostsOptions = {
  category?: CommunityCategory;
  page?: number;
  pageSize?: number;
  /** "new" (최신순) | "popular" (좋아요 / 조회수 가중) */
  sort?: "new" | "popular";
};

export async function listCommunityPosts(
  opts: ListPostsOptions = {},
): Promise<{ items: CommunityPostListItem[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    100,
    Math.max(1, opts.pageSize ?? COMMUNITY_LIMITS.PAGE_SIZE),
  );
  const where = {
    status: "published" as const,
    ...(isCategory(opts.category) ? { category: opts.category } : {}),
  };
  const orderBy =
    opts.sort === "popular"
      ? [
          { likeCount: "desc" as const },
          { viewCount: "desc" as const },
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  const db = getPrisma();
  const [rows, total] = await Promise.all([
    db.communityPost.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { comments: true } },
      },
    }),
    db.communityPost.count({ where }),
  ]);

  const items: CommunityPostListItem[] = rows.map((r) => ({
    id: r.id,
    category: r.category as CommunityCategory,
    title: r.title,
    bodyExcerpt: excerpt(r.body),
    authorName: r.authorName,
    isAnonymous: r.isAnonymous,
    status: r.status as CommunityPostListItem["status"],
    reportCount: r.reportCount,
    likeCount: r.likeCount,
    viewCount: r.viewCount,
    commentCount: r._count.comments,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return { items, total, page, pageSize };
}

export async function getCommunityPostDetail(
  id: string,
  options: { incrementView?: boolean } = {},
): Promise<CommunityPostDetail | null> {
  const db = getPrisma();
  const post = await db.communityPost.findFirst({
    where: { id, status: "published" },
    include: {
      comments: {
        where: { status: "published" },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
      _count: { select: { comments: true } },
    },
  });
  if (!post) return null;

  if (options.incrementView) {
    // fire-and-forget — 카운트 증가 실패해도 응답에 영향 없음
    db.communityPost
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {
        /* ignore */
      });
  }

  const comments: CommunityCommentItem[] = post.comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorName: c.authorName,
    isAnonymous: c.isAnonymous,
    status: c.status as CommunityCommentItem["status"],
    reportCount: c.reportCount,
    createdAt: c.createdAt.toISOString(),
  }));

  return {
    id: post.id,
    category: post.category as CommunityCategory,
    title: post.title,
    body: post.body,
    bodyExcerpt: excerpt(post.body),
    authorName: post.authorName,
    isAnonymous: post.isAnonymous,
    status: post.status as CommunityPostDetail["status"],
    reportCount: post.reportCount,
    likeCount: post.likeCount,
    viewCount: post.viewCount + (options.incrementView ? 1 : 0),
    commentCount: post._count.comments,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    comments,
  };
}

// ── 작성 ──

export type CreatePostParams = {
  category: CommunityCategory;
  title: string;
  body: string;
  authorName: string;
  authorEmail: string | null;
  authorUserId: string | null;
  isAnonymous: boolean;
  authorIp: string | null;
};

export async function createCommunityPost(p: CreatePostParams) {
  const db = getPrisma();
  return db.communityPost.create({
    data: {
      category: p.category,
      title: p.title,
      body: p.body,
      authorName: p.authorName,
      authorEmail: p.authorEmail,
      authorUserId: p.authorUserId,
      isAnonymous: p.isAnonymous,
      authorIp: p.authorIp,
    },
    select: { id: true },
  });
}

export type CreateCommentParams = {
  postId: string;
  body: string;
  authorName: string;
  authorUserId: string | null;
  authorEmail: string | null;
  isAnonymous: boolean;
  authorIp: string | null;
};

export async function createCommunityComment(p: CreateCommentParams) {
  const db = getPrisma();
  // 게시글 존재 + published 확인
  const post = await db.communityPost.findFirst({
    where: { id: p.postId, status: "published" },
    select: { id: true },
  });
  if (!post) throw new Error("Post not found");
  return db.communityComment.create({
    data: {
      postId: p.postId,
      body: p.body,
      authorName: p.authorName,
      authorEmail: p.authorEmail,
      authorUserId: p.authorUserId,
      isAnonymous: p.isAnonymous,
      authorIp: p.authorIp,
    },
    select: { id: true },
  });
}

// ── 좋아요 / 신고 ──

import { createHash } from "node:crypto";

function hashIp(ip: string): string {
  return createHash("sha256").update(`tkad-community-${ip}`).digest("hex");
}

/**
 * 좋아요 토글. 이미 좋아요한 경우 false (중복) 반환.
 * 가입 사용자: userId 로 unique. 익명: ipHash 로 unique.
 */
export async function likeCommunityPost(
  postId: string,
  userId: string | null,
  ip: string | null,
): Promise<{ ok: true; alreadyLiked: boolean }> {
  if (!userId && !ip) return { ok: true, alreadyLiked: false };
  const db = getPrisma();
  const ipHash = !userId && ip ? hashIp(ip) : null;
  try {
    await db.communityPostLike.create({
      data: {
        postId,
        userId,
        ipHash,
      },
    });
    await db.communityPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return { ok: true, alreadyLiked: false };
  } catch {
    // unique 위반 — 이미 좋아요함
    return { ok: true, alreadyLiked: true };
  }
}

export async function reportCommunityTarget(
  targetType: "post" | "comment",
  targetId: string,
  reason: string,
  ip: string | null,
  userId: string | null,
): Promise<{ ok: true; autoHidden: boolean }> {
  const db = getPrisma();
  await db.communityReport.create({
    data: {
      targetType,
      targetId,
      reason,
      reporterIp: ip,
      reporterUserId: userId,
    },
  });

  // 신고 누적 시 자동 hidden
  let autoHidden = false;
  if (targetType === "post") {
    const updated = await db.communityPost.update({
      where: { id: targetId },
      data: { reportCount: { increment: 1 } },
      select: { reportCount: true, status: true },
    });
    if (
      updated.reportCount >= COMMUNITY_LIMITS.REPORT_AUTO_HIDE_THRESHOLD &&
      updated.status === "published"
    ) {
      await db.communityPost.update({
        where: { id: targetId },
        data: { status: "hidden" },
      });
      autoHidden = true;
    }
  } else {
    const updated = await db.communityComment.update({
      where: { id: targetId },
      data: { reportCount: { increment: 1 } },
      select: { reportCount: true, status: true },
    });
    if (
      updated.reportCount >= COMMUNITY_LIMITS.REPORT_AUTO_HIDE_THRESHOLD &&
      updated.status === "published"
    ) {
      await db.communityComment.update({
        where: { id: targetId },
        data: { status: "hidden" },
      });
      autoHidden = true;
    }
  }
  return { ok: true, autoHidden };
}
