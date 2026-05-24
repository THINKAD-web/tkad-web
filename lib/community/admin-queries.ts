/**
 * Community admin moderation queries — server-only.
 *
 * 일반 user-facing queries (queries.ts) 와 분리. 어드민은 published / hidden /
 * deleted 모든 status 조회 가능.
 */

import { getPrisma } from "@/lib/prisma";
import {
  normalizeCommunityCategory,
  resolveCommunityCategoryWhere,
  type CommunityCategory,
} from "@/lib/community/types";

export type AdminPostListItem = {
  id: string;
  category: CommunityCategory;
  title: string;
  bodyExcerpt: string;
  authorName: string;
  authorEmail: string | null;
  authorIp: string | null;
  isAnonymous: boolean;
  status: string;
  reportCount: number;
  likeCount: number;
  viewCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminCommentListItem = {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  authorName: string;
  authorEmail: string | null;
  authorIp: string | null;
  isAnonymous: boolean;
  status: string;
  reportCount: number;
  createdAt: string;
};

export type AdminReportItem = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  reporterIp: string | null;
  reporterUserId: string | null;
  createdAt: string;
};

function excerpt(s: string, n = 200): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n) + "…";
}

export type AdminListPostsOptions = {
  status?: "all" | "published" | "hidden" | "deleted";
  category?: CommunityCategory;
  hasReports?: boolean;
  page?: number;
  pageSize?: number;
};

export async function adminListPosts(
  opts: AdminListPostsOptions = {},
): Promise<{
  items: AdminPostListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const where: Record<string, unknown> = {};
  if (opts.status && opts.status !== "all") where.status = opts.status;
  if (opts.category) {
    where.category = resolveCommunityCategoryWhere(opts.category);
  }
  if (opts.hasReports) where.reportCount = { gt: 0 };

  const db = getPrisma();
  const [rows, total] = await Promise.all([
    db.communityPost.findMany({
      where,
      orderBy: [
        { reportCount: "desc" },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { comments: true } } },
    }),
    db.communityPost.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      category: normalizeCommunityCategory(r.category) ?? "free",
      title: r.title,
      bodyExcerpt: excerpt(r.body),
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorIp: r.authorIp,
      isAnonymous: r.isAnonymous,
      status: r.status,
      reportCount: r.reportCount,
      likeCount: r.likeCount,
      viewCount: r.viewCount,
      commentCount: r._count.comments,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export type AdminListCommentsOptions = {
  status?: "all" | "published" | "hidden" | "deleted";
  hasReports?: boolean;
  page?: number;
  pageSize?: number;
};

export async function adminListComments(
  opts: AdminListCommentsOptions = {},
): Promise<{
  items: AdminCommentListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 30));
  const where: Record<string, unknown> = {};
  if (opts.status && opts.status !== "all") where.status = opts.status;
  if (opts.hasReports) where.reportCount = { gt: 0 };

  const db = getPrisma();
  const [rows, total] = await Promise.all([
    db.communityComment.findMany({
      where,
      orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        post: { select: { title: true } },
      },
    }),
    db.communityComment.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      postId: r.postId,
      postTitle: r.post.title,
      body: r.body,
      authorName: r.authorName,
      authorEmail: r.authorEmail,
      authorIp: r.authorIp,
      isAnonymous: r.isAnonymous,
      status: r.status,
      reportCount: r.reportCount,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

export async function adminGetReportsForTarget(
  targetType: "post" | "comment",
  targetId: string,
): Promise<AdminReportItem[]> {
  const db = getPrisma();
  const rows = await db.communityReport.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    reason: r.reason,
    reporterIp: r.reporterIp,
    reporterUserId: r.reporterUserId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export type AdminTargetStatus = "published" | "hidden" | "deleted";

/** 어드민 — 게시글 status 변경 (복구 / 영구 숨김 / 삭제). */
export async function adminUpdatePostStatus(
  id: string,
  status: AdminTargetStatus,
): Promise<void> {
  const db = getPrisma();
  await db.communityPost.update({
    where: { id },
    data: { status },
  });
}

export async function adminUpdateCommentStatus(
  id: string,
  status: AdminTargetStatus,
): Promise<void> {
  const db = getPrisma();
  await db.communityComment.update({
    where: { id },
    data: { status },
  });
}

/** 어드민 — 게시글 영구 삭제 (DB 레코드 자체 제거. cascade 로 댓글도 사라짐). */
export async function adminHardDeletePost(id: string): Promise<void> {
  const db = getPrisma();
  await db.communityPost.delete({ where: { id } });
}

export async function adminHardDeleteComment(id: string): Promise<void> {
  const db = getPrisma();
  await db.communityComment.delete({ where: { id } });
}

/** 통계 — 어드민 헤더 뱃지용. */
export async function adminCommunityStats(): Promise<{
  postsTotal: number;
  postsHidden: number;
  postsWithReports: number;
  commentsTotal: number;
  commentsHidden: number;
  commentsWithReports: number;
}> {
  const db = getPrisma();
  const [
    postsTotal,
    postsHidden,
    postsWithReports,
    commentsTotal,
    commentsHidden,
    commentsWithReports,
  ] = await Promise.all([
    db.communityPost.count(),
    db.communityPost.count({ where: { status: "hidden" } }),
    db.communityPost.count({ where: { reportCount: { gt: 0 } } }),
    db.communityComment.count(),
    db.communityComment.count({ where: { status: "hidden" } }),
    db.communityComment.count({ where: { reportCount: { gt: 0 } } }),
  ]);
  return {
    postsTotal,
    postsHidden,
    postsWithReports,
    commentsTotal,
    commentsHidden,
    commentsWithReports,
  };
}
