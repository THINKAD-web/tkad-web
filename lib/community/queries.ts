/**
 * Community DB queries — server-only.
 *
 * Prisma 직접 import 모두 여기로 격리. UI / API 라우트는 이 모듈만 import.
 */

import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import {
  COMMUNITY_LIMITS,
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityCategory,
  normalizeCommunityMemberRole,
  type CommunityAuthorSummary,
  type CommunityCategory,
  type CommunityCommentItem,
  type CommunityMemberListItem,
  type CommunityPostDetail,
  type CommunityPostListItem,
} from "@/lib/community/types";

type CommunityUserRow = {
  id: string;
  name: string;
  company: string | null;
  role: string;
  communityRole: string | null;
  communityBio: string | null;
};

const COMMUNITY_USER_SELECT = {
  id: true,
  name: true,
  company: true,
  role: true,
  communityRole: true,
  communityBio: true,
} as const;

function excerpt(body: string): string {
  const trimmed = body.replace(/\s+/g, " ").trim();
  if (trimmed.length <= COMMUNITY_LIMITS.EXCERPT_LEN) return trimmed;
  return `${trimmed.slice(0, COMMUNITY_LIMITS.EXCERPT_LEN)}…`;
}

function resolveCategoryWhere(category?: CommunityCategory | null) {
  if (!category) return undefined;
  if (category === "qna") return { in: ["qna", "qa"] };
  if (category === "networking") return { in: ["networking", "recommend"] };
  return category;
}

function toAuthorSummary(user: CommunityUserRow | null): CommunityAuthorSummary | null {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    company: user.company,
    role:
      normalizeCommunityMemberRole(user.communityRole) ??
      fallbackCommunityRoleFromAppRole(user.role),
    bio: user.communityBio,
  };
}

function toPostListItem(row: {
  id: string;
  category: string;
  title: string;
  body: string;
  authorName: string;
  isAnonymous: boolean;
  status: string;
  reportCount: number;
  likeCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { comments: number };
  authorUser: CommunityUserRow | null;
}): CommunityPostListItem {
  const author = row.isAnonymous ? null : toAuthorSummary(row.authorUser);
  return {
    id: row.id,
    category: normalizeCommunityCategory(row.category) ?? "qna",
    title: row.title,
    bodyExcerpt: excerpt(row.body),
    authorName: row.isAnonymous ? "익명" : author?.name ?? row.authorName,
    isAnonymous: row.isAnonymous,
    author,
    status: row.status as CommunityPostListItem["status"],
    reportCount: row.reportCount,
    likeCount: row.likeCount,
    viewCount: row.viewCount,
    commentCount: row._count.comments,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCommentItem(row: {
  id: string;
  body: string;
  authorName: string;
  isAnonymous: boolean;
  status: string;
  reportCount: number;
  createdAt: Date;
  authorUser: CommunityUserRow | null;
}, currentUserId?: string | null): CommunityCommentItem {
  const author = row.isAnonymous ? null : toAuthorSummary(row.authorUser);
  return {
    id: row.id,
    body: row.body,
    authorName: row.isAnonymous ? "익명" : author?.name ?? row.authorName,
    isAnonymous: row.isAnonymous,
    author,
    status: row.status as CommunityCommentItem["status"],
    reportCount: row.reportCount,
    createdAt: row.createdAt.toISOString(),
    editableByMe: !!(currentUserId && row.authorUser?.id === currentUserId),
  };
}

function calcMixedScore(row: {
  createdAt: Date;
  likeCount: number;
  viewCount: number;
  _count: { comments: number };
}) {
  const ageDays = Math.max(
    0,
    (Date.now() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const recencyScore = Math.max(0, 1 - ageDays / 30);
  const popularityScore = Math.min(
    1,
    row.likeCount * 0.18 + row._count.comments * 0.12 + row.viewCount * 0.004,
  );
  return recencyScore * 0.7 + popularityScore * 0.3;
}

export type ListPostsOptions = {
  category?: CommunityCategory;
  page?: number;
  pageSize?: number;
  /** "mixed" (최근+반응 가중) | "new" (최신순) | "popular" (좋아요/댓글/조회수) */
  sort?: "mixed" | "new" | "popular";
};

export async function listCommunityPosts(
  opts: ListPostsOptions = {},
): Promise<{
  items: CommunityPostListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(
    100,
    Math.max(1, opts.pageSize ?? COMMUNITY_LIMITS.PAGE_SIZE),
  );
  const category = normalizeCommunityCategory(opts.category);
  const sort = opts.sort ?? "mixed";
  const where = {
    status: "published" as const,
    ...(category ? { category: resolveCategoryWhere(category) } : {}),
  };

  const db = getPrisma();
  const total = await db.communityPost.count({ where });

  if (sort === "mixed") {
    const candidateTake = Math.min(160, Math.max(page * pageSize * 4, 80));
    const rows = await db.communityPost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: candidateTake,
      include: {
        _count: { select: { comments: true } },
        authorUser: { select: COMMUNITY_USER_SELECT },
      },
    });
    const items = rows
      .sort((a, b) => {
        const scoreDiff = calcMixedScore(b) - calcMixedScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice((page - 1) * pageSize, page * pageSize)
      .map(toPostListItem);
    return { items, total, page, pageSize };
  }

  const orderBy =
    sort === "popular"
      ? [
          { likeCount: "desc" as const },
          { viewCount: "desc" as const },
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  const rows = await db.communityPost.findMany({
    where,
    orderBy,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      _count: { select: { comments: true } },
      authorUser: { select: COMMUNITY_USER_SELECT },
    },
  });

  return {
    items: rows.map(toPostListItem),
    total,
    page,
    pageSize,
  };
}

export async function listHomeCommunityPosts(): Promise<CommunityPostListItem[]> {
  const result = await listCommunityPosts({
    page: 1,
    pageSize: COMMUNITY_LIMITS.HOME_SECTION_SIZE,
    sort: "popular",
  });
  return result.items;
}

export async function getCommunityPostDetail(
  id: string,
  options: { incrementView?: boolean; currentUserId?: string | null } = {},
): Promise<CommunityPostDetail | null> {
  const db = getPrisma();
  const post = await db.communityPost.findFirst({
    where: { id, status: "published" },
    include: {
      authorUser: { select: COMMUNITY_USER_SELECT },
      comments: {
        where: { status: "published" },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          authorUser: { select: COMMUNITY_USER_SELECT },
        },
      },
      _count: { select: { comments: true } },
      ...(options.currentUserId
        ? {
            likes: {
              where: { userId: options.currentUserId },
              select: { id: true },
            },
            bookmarks: {
              where: { userId: options.currentUserId },
              select: { id: true },
            },
          }
        : {}),
    },
  });
  if (!post) return null;

  if (options.incrementView) {
    db.communityPost
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {
        /* ignore */
      });
  }

  const likedByMe =
    options.currentUserId && Array.isArray((post as { likes?: unknown[] }).likes)
      ? ((post as { likes?: unknown[] }).likes?.length ?? 0) > 0
      : false;
  const bookmarkedByMe =
    options.currentUserId && Array.isArray((post as { bookmarks?: unknown[] }).bookmarks)
      ? ((post as { bookmarks?: unknown[] }).bookmarks?.length ?? 0) > 0
      : false;

  return {
    ...toPostListItem(post),
    body: post.body,
    likedByMe,
    bookmarkedByMe,
    comments: post.comments.map((comment) =>
      toCommentItem(comment, options.currentUserId),
    ),
    viewCount: post.viewCount + (options.incrementView ? 1 : 0),
  };
}

export type CreatePostParams = {
  category: CommunityCategory;
  title: string;
  body: string;
  authorName: string;
  authorEmail: string | null;
  authorUserId: string;
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
      isAnonymous: false,
      authorIp: p.authorIp,
    },
    select: { id: true },
  });
}

export type CreateCommentParams = {
  postId: string;
  body: string;
  authorName: string;
  authorUserId: string;
  authorEmail: string | null;
  authorIp: string | null;
};

export async function createCommunityComment(p: CreateCommentParams) {
  const db = getPrisma();
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
      isAnonymous: false,
      authorIp: p.authorIp,
    },
    include: {
      authorUser: { select: COMMUNITY_USER_SELECT },
    },
  });
}

type UpdateCommentParams = {
  postId: string;
  commentId: string;
  userId: string;
  body: string;
};

async function getOwnedCommunityCommentOrThrow(params: {
  postId: string;
  commentId: string;
  userId: string;
}) {
  const db = getPrisma();
  const comment = await db.communityComment.findFirst({
    where: { id: params.commentId, postId: params.postId },
    include: {
      authorUser: { select: COMMUNITY_USER_SELECT },
    },
  });
  if (!comment) throw new Error("Comment not found");
  if (!comment.authorUserId || comment.authorUserId !== params.userId) {
    throw new Error("Forbidden");
  }
  return comment;
}

export async function updateCommunityComment(params: UpdateCommentParams) {
  const db = getPrisma();
  await getOwnedCommunityCommentOrThrow(params);
  return db.communityComment.update({
    where: { id: params.commentId },
    data: { body: params.body },
    include: {
      authorUser: { select: COMMUNITY_USER_SELECT },
    },
  });
}

export async function deleteCommunityComment(params: {
  postId: string;
  commentId: string;
  userId: string;
}) {
  const db = getPrisma();
  await getOwnedCommunityCommentOrThrow(params);
  await db.communityComment.delete({
    where: { id: params.commentId },
  });
  return { ok: true as const };
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`tkad-community-${ip}`).digest("hex");
}

export async function likeCommunityPost(
  postId: string,
  userId: string,
): Promise<{ ok: true; alreadyLiked: boolean }> {
  const db = getPrisma();
  try {
    await db.communityPostLike.create({
      data: {
        postId,
        userId,
      },
    });
    await db.communityPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    });
    return { ok: true, alreadyLiked: false };
  } catch {
    return { ok: true, alreadyLiked: true };
  }
}

export async function toggleCommunityBookmark(
  postId: string,
  userId: string,
): Promise<{ ok: true; active: boolean }> {
  const db = getPrisma();
  const existing = await db.communityBookmark.findFirst({
    where: { postId, userId },
    select: { id: true },
  });
  if (existing) {
    await db.communityBookmark.delete({ where: { id: existing.id } });
    return { ok: true, active: false };
  }
  await db.communityBookmark.create({
    data: { postId, userId },
  });
  return { ok: true, active: true };
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
      reporterIp: userId ? ip : (ip ? hashIp(ip) : null),
      reporterUserId: userId,
    },
  });

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

export async function listCommunityMembers(): Promise<CommunityMemberListItem[]> {
  const db = getPrisma();
  const rows = await db.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { communityRole: { not: null } },
        { communityBio: { not: null } },
        { communityPosts: { some: { status: "published" } } },
        { communityComments: { some: { status: "published" } } },
      ],
    },
    select: {
      ...COMMUNITY_USER_SELECT,
      _count: {
        select: {
          communityPosts: { where: { status: "published" } },
          communityComments: { where: { status: "published" } },
        },
      },
      communityPosts: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      communityComments: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    take: 100,
  });

  return rows
    .map((row) => {
      const latestPostAt = row.communityPosts[0]?.createdAt ?? null;
      const latestCommentAt = row.communityComments[0]?.createdAt ?? null;
      const latestActivityAt = [latestPostAt, latestCommentAt]
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ?? null;
      return {
        ...toAuthorSummary(row)!,
        postCount: row._count.communityPosts,
        commentCount: row._count.communityComments,
        latestActivityAt: latestActivityAt ? latestActivityAt.toISOString() : null,
      };
    })
    .sort((a, b) => {
      const aTs = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
      const bTs = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
      if (bTs !== aTs) return bTs - aTs;
      return b.postCount + b.commentCount - (a.postCount + a.commentCount);
    });
}

export async function getCommunityMemberProfile(userId: string) {
  const db = getPrisma();
  const row = await db.user.findFirst({
    where: {
      id: userId,
      deletedAt: null,
    },
    select: {
      ...COMMUNITY_USER_SELECT,
      _count: {
        select: {
          communityPosts: { where: { status: "published" } },
          communityComments: { where: { status: "published" } },
        },
      },
      communityPosts: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          _count: { select: { comments: true } },
          authorUser: { select: COMMUNITY_USER_SELECT },
        },
      },
    },
  });
  if (!row) return null;

  return {
    member: {
      ...toAuthorSummary(row)!,
      postCount: row._count.communityPosts,
      commentCount: row._count.communityComments,
      latestActivityAt: row.communityPosts[0]?.createdAt.toISOString() ?? null,
    },
    recentPosts: row.communityPosts.map(toPostListItem),
  };
}
