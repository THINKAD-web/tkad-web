/**
 * Community DB queries — server-only.
 *
 * Prisma 직접 import 모두 여기로 격리. UI / API 라우트는 이 모듈만 import.
 */

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  COMMUNITY_LIMITS,
  fallbackCommunityRoleFromAppRole,
  normalizeCommunityCategory,
  normalizeCommunityMemberRole,
  type CommunityAuthorSummary,
  type CommunityCategory,
  type CommunityCommentItem,
  type CommunityMemberListItem,
  type CommunityMemberRole,
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
  /** DB 마이그레이션 전에는 select 에 포함되지 않을 수 있음 */
  region?: string | null;
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
    region: user.region ?? null,
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

/** 빌드/미리보기 등 DB 미연결·인증 실패·스키마 불일치 시 커뮤니티 읽기 생략 */
export function shouldDegradeHomeCommunityPosts(e: unknown): boolean {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    (e.code === "P1000" ||
      e.code === "P1001" ||
      e.code === "P1017" ||
      /** 스키마에 컬럼이 아직 없을 때(예: `users.region` 마이그레이션 전) 홈만 생략 */
      e.code === "P2022" ||
      /** 테이블이 아직 없을 때(마이그레이션 전 DB 등) — 홈 전체 500 방지 */
      e.code === "P2021" ||
      /** 컬럼 데이터 불일치 등 읽기 단계 스키마 drift */
      e.code === "P2023")
  ) {
    return true;
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (e instanceof Error) {
    const msg = e.message || "";
    if (/Authentication failed against the database server/i.test(msg)) return true;
    if (/AuthenticationFailed/i.test(msg)) return true;
  }
  return false;
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

/** 홈 featured / API `featured` 공용. `popular` 요청 시 공개 글이 5개 미만이면 자동으로 `latest` 로 전환. */
export type FeaturedCommunitySort = "popular" | "latest";

const MIN_PUBLISHED_POSTS_FOR_POPULAR_SORT = 5;

export async function listFeaturedCommunityPosts(opts: {
  limit?: number;
  sortBy?: FeaturedCommunitySort;
  /** 지정 시 해당 카테고리의 공개 글만 후보로 사용 (리포트 상세의 관련 커뮤니티 등). */
  category?: CommunityCategory;
}): Promise<{
  posts: CommunityPostListItem[];
  sortBy: FeaturedCommunitySort;
}> {
  if (!isDatabaseConfigured()) {
    const sortBy = opts.sortBy ?? "popular";
    return { posts: [], sortBy };
  }

  const limit = Math.min(20, Math.max(1, opts.limit ?? 3));
  const requested: FeaturedCommunitySort = opts.sortBy ?? "popular";
  const db = getPrisma();
  const category = normalizeCommunityCategory(opts.category);
  const where = {
    status: "published" as const,
    ...(category ? { category: resolveCategoryWhere(category) } : {}),
  };
  const total = await db.communityPost.count({
    where,
  });

  let effective: FeaturedCommunitySort = requested;
  if (requested === "popular" && total < MIN_PUBLISHED_POSTS_FOR_POPULAR_SORT) {
    effective = "latest";
  }

  const orderBy: Prisma.CommunityPostOrderByWithRelationInput[] =
    effective === "popular"
      ? [{ likeCount: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const rows = await db.communityPost.findMany({
    where,
    orderBy,
    take: limit,
    include: {
      _count: { select: { comments: true } },
      authorUser: { select: COMMUNITY_USER_SELECT },
    },
  });

  return {
    posts: rows.map(toPostListItem),
    sortBy: effective,
  };
}

export async function listHomeCommunityPosts(): Promise<CommunityPostListItem[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    const { posts } = await listFeaturedCommunityPosts({
      limit: COMMUNITY_LIMITS.HOME_SECTION_SIZE,
      sortBy: "popular",
    });
    return posts;
  } catch (e) {
    if (shouldDegradeHomeCommunityPosts(e)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[listHomeCommunityPosts] DB unavailable; home community section empty.",
          e,
        );
      }
      return [];
    }
    throw e;
  }
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

const COMMUNITY_MEMBER_DIRECTORY_VISIBILITY: Prisma.UserWhereInput = {
  OR: [
    { communityRole: { not: null } },
    { communityBio: { not: null } },
    { communityPosts: { some: { status: "published" } } },
    { communityComments: { some: { status: "published" } } },
  ],
};

function communityDirectoryRoleWhere(role: CommunityMemberRole): Prisma.UserWhereInput {
  switch (role) {
    case "ADVERTISER":
      return {
        OR: [
          { communityRole: "ADVERTISER" },
          { AND: [{ communityRole: null }, { role: "advertiser" }] },
        ],
      };
    case "MEDIA":
      return {
        OR: [
          { communityRole: "MEDIA" },
          { AND: [{ communityRole: null }, { role: "owner" }] },
        ],
      };
    case "AGENCY":
      return {
        OR: [
          { communityRole: "AGENCY" },
          { AND: [{ communityRole: null }, { role: "agency" }] },
        ],
      };
    case "FREELANCER":
      return {
        OR: [
          { communityRole: "FREELANCER" },
          { AND: [{ communityRole: null }, { role: "admin" }] },
        ],
      };
    default:
      return {};
  }
}

function communityDirectoryRegionWhere(region: string): Prisma.UserWhereInput | undefined {
  const r = region.trim();
  if (!r || r === "전체" || r === "all") return undefined;
  if (r === "기타") {
    return {
      AND: [
        { region: { not: null } },
        { NOT: { region: { in: ["서울", "부산", "대구"] } } },
      ],
    };
  }
  return { region: r };
}

export function buildCommunityMemberDirectoryWhereInput(opts: {
  role?: CommunityMemberRole | null;
  region?: string | null;
}): Prisma.UserWhereInput {
  const parts: Prisma.UserWhereInput[] = [
    { deletedAt: null },
    COMMUNITY_MEMBER_DIRECTORY_VISIBILITY,
  ];
  if (opts.role) {
    parts.push(communityDirectoryRoleWhere(opts.role));
  }
  const regionW = opts.region ? communityDirectoryRegionWhere(opts.region) : undefined;
  if (regionW) parts.push(regionW);
  return { AND: parts };
}

export async function listCommunityMembersPaginated(opts: {
  role?: CommunityMemberRole | null;
  region?: string | null;
  page?: number;
}): Promise<{
  members: CommunityMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const pageSize = COMMUNITY_LIMITS.MEMBER_DIRECTORY_PAGE_SIZE;
  const page = Math.max(1, opts.page ?? 1);
  const where = buildCommunityMemberDirectoryWhereInput({
    role: opts.role ?? null,
    region: opts.region ?? null,
  });

  const db = getPrisma();
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        ...COMMUNITY_USER_SELECT,
        region: true,
        createdAt: true,
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
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const members: CommunityMemberListItem[] = rows.map((row) => {
    const latestPostAt = row.communityPosts[0]?.createdAt ?? null;
    const latestCommentAt = row.communityComments[0]?.createdAt ?? null;
    const latestActivityAt =
      [latestPostAt, latestCommentAt]
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] ?? null;

    return {
      ...toAuthorSummary({
        id: row.id,
        name: row.name,
        company: row.company,
        role: row.role,
        communityRole: row.communityRole,
        communityBio: row.communityBio,
        region: row.region,
      })!,
      postCount: row._count.communityPosts,
      commentCount: row._count.communityComments,
      latestActivityAt: latestActivityAt ? latestActivityAt.toISOString() : null,
      joinedAt: row.createdAt.toISOString(),
    };
  });

  return { members, total, page, pageSize };
}

export async function getCommunityMemberDirectoryStats() {
  const db = getPrisma();
  const base = buildCommunityMemberDirectoryWhereInput({});
  const [totalMembers, activeAuthors, activeDiscussants, companyGroups] =
    await Promise.all([
      db.user.count({ where: base }),
      db.user.count({
        where: {
          AND: [base, { communityPosts: { some: { status: "published" } } }],
        },
      }),
      db.user.count({
        where: {
          AND: [base, { communityComments: { some: { status: "published" } } }],
        },
      }),
      db.user.groupBy({
        by: ["company"],
        where: {
          AND: [
            base,
            { company: { not: null } },
            { NOT: { company: { equals: "" } } },
          ],
        },
      }),
    ]);

  const companies = companyGroups.filter((g) => g.company?.trim()).length;

  return { totalMembers, activeAuthors, activeDiscussants, companies };
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
      region: true,
      createdAt: true,
      _count: {
        select: {
          communityPosts: { where: { status: "published" } },
          communityComments: { where: { status: "published" } },
        },
      },
      communityPosts: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          _count: { select: { comments: true } },
          authorUser: { select: COMMUNITY_USER_SELECT },
        },
      },
    },
  });
  if (!row) return null;

  const likeAgg = await db.communityPost.aggregate({
    where: { authorUserId: userId, status: "published" },
    _sum: { likeCount: true },
  });
  const likesReceived = likeAgg._sum.likeCount ?? 0;

  return {
    member: {
      ...toAuthorSummary(row)!,
      postCount: row._count.communityPosts,
      commentCount: row._count.communityComments,
      joinedAt: row.createdAt.toISOString(),
      likesReceived,
    },
    recentPosts: row.communityPosts.map(toPostListItem),
  };
}

export async function updateCommunityMemberProfile(opts: {
  actorUserId: string;
  targetUserId: string;
  name: string;
  company: string | null;
  bio: string | null;
  region: string | null;
}) {
  if (opts.actorUserId !== opts.targetUserId) {
    return { ok: false as const, code: "FORBIDDEN" as const };
  }
  const db = getPrisma();
  await db.user.update({
    where: { id: opts.targetUserId, deletedAt: null },
    data: {
      name: opts.name,
      company: opts.company,
      communityBio: opts.bio,
      region: opts.region,
    },
  });
  return { ok: true as const };
}
