import type { MediaReviewStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type MediaReviewStats = {
  averageRating: number;
  reviewCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PublicMediaReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  campaignPeriod: string | null;
  industry: string | null;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  authorLabel: string;
  userHasMarkedHelpful?: boolean;
};

const EMPTY_DIST: MediaReviewStats["distribution"] = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

export function reviewAuthorLabel(
  industry: string | null | undefined,
  isKo: boolean,
): string {
  const ind = industry?.trim();
  if (ind) {
    return isKo ? `${ind} 브랜드 광고주` : `${ind} brand advertiser`;
  }
  return isKo ? "익명 광고주" : "Anonymous advertiser";
}

export async function getMediaReviewStatsForIds(
  mediaIds: string[],
): Promise<Map<string, MediaReviewStats>> {
  const map = new Map<string, MediaReviewStats>();
  if (!isDatabaseConfigured() || mediaIds.length === 0) return map;

  const db = getPrisma();
  const rows = await db.mediaReview.groupBy({
    by: ["mediaId", "rating"],
    where: { mediaId: { in: mediaIds }, status: "APPROVED" },
    _count: { _all: true },
  });

  const acc = new Map<
    string,
    { total: number; sum: number; dist: MediaReviewStats["distribution"] }
  >();

  for (const row of rows) {
    const rating = row.rating as 1 | 2 | 3 | 4 | 5;
    if (rating < 1 || rating > 5) continue;
    let entry = acc.get(row.mediaId);
    if (!entry) {
      entry = { total: 0, sum: 0, dist: { ...EMPTY_DIST } };
      acc.set(row.mediaId, entry);
    }
    const count = row._count._all;
    entry.total += count;
    entry.sum += rating * count;
    entry.dist[rating] += count;
  }

  for (const [mediaId, entry] of acc) {
    map.set(mediaId, {
      reviewCount: entry.total,
      averageRating:
        entry.total > 0
          ? Math.round((entry.sum / entry.total) * 10) / 10
          : 0,
      distribution: entry.dist,
    });
  }

  return map;
}

export async function getMediaReviewStats(
  mediaId: string,
): Promise<MediaReviewStats> {
  const map = await getMediaReviewStatsForIds([mediaId]);
  return (
    map.get(mediaId) ?? {
      averageRating: 0,
      reviewCount: 0,
      distribution: { ...EMPTY_DIST },
    }
  );
}

export async function listApprovedMediaReviews(
  mediaId: string,
  options?: { viewerUserId?: string | null; limit?: number; offset?: number },
): Promise<{ items: PublicMediaReview[]; total: number }> {
  if (!isDatabaseConfigured()) {
    return { items: [], total: 0 };
  }

  const db = getPrisma();
  const where = { mediaId, status: "APPROVED" as MediaReviewStatus };

  const [total, rows] = await Promise.all([
    db.mediaReview.count({ where }),
    db.mediaReview.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 20,
      skip: options?.offset ?? 0,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        campaignPeriod: true,
        industry: true,
        isVerified: true,
        helpfulCount: true,
        createdAt: true,
        helpfuls:
          options?.viewerUserId != null
            ? {
                where: { userId: options.viewerUserId },
                select: { id: true },
                take: 1,
              }
            : false,
      },
    }),
  ]);

  const items: PublicMediaReview[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    campaignPeriod: r.campaignPeriod,
    industry: r.industry,
    isVerified: r.isVerified,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    authorLabel: reviewAuthorLabel(r.industry, true),
    userHasMarkedHelpful:
      options?.viewerUserId != null &&
      Array.isArray(r.helpfuls) &&
      r.helpfuls.length > 0,
  }));

  return { items, total };
}

/** 완료 캠페인·확정 예약 기반 실집행 인증 */
export async function userHasVerifiedExecution(
  userId: string,
  mediaId: string,
): Promise<{ verified: boolean; campaignId: string | null }> {
  if (!isDatabaseConfigured()) {
    return { verified: false, campaignId: null };
  }

  const db = getPrisma();
  const booking = await db.mediaBooking.findFirst({
    where: {
      mediaId,
      status: "confirmed",
      campaign: { status: "completed" },
      OR: [
        { requestedByUserId: userId },
        { campaign: { ownerUserId: userId } },
      ],
    },
    select: { campaignId: true },
    orderBy: { endsAt: "desc" },
  });

  if (!booking?.campaignId) return { verified: false, campaignId: null };

  return { verified: true, campaignId: booking.campaignId };
}

export type MediaReviewEligibility = {
  canReview: boolean;
  reason?: "login_required" | "already_reviewed";
  reviewId?: string;
  status?: MediaReviewStatus;
  isVerifiedEligible?: boolean;
};

/** GET /api/media/[id]/reviews 와 동일한 canReview 판정 */
export async function getMediaReviewEligibility(
  userId: string | null,
  mediaId: string,
): Promise<MediaReviewEligibility> {
  if (!userId) {
    return { canReview: false, reason: "login_required" };
  }
  if (!isDatabaseConfigured()) {
    return { canReview: false, reason: "login_required" };
  }

  const db = getPrisma();
  const existing = await db.mediaReview.findUnique({
    where: { mediaId_userId: { mediaId, userId } },
    select: { id: true, status: true },
  });
  if (existing) {
    return {
      canReview: false,
      reason: "already_reviewed",
      reviewId: existing.id,
      status: existing.status,
    };
  }

  const { verified } = await userHasVerifiedExecution(userId, mediaId);

  return {
    canReview: true,
    isVerifiedEligible: verified,
  };
}

export type MediaReviewsInitialStats = {
  stats: MediaReviewStats;
  /** SSR에서 생략 시 클라이언트 eligibility fetch로 보완 */
  canReview?: boolean;
};

export async function fetchMediaReviewsInitialStats(
  mediaId: string,
): Promise<MediaReviewsInitialStats> {
  return {
    stats: await getMediaReviewStats(mediaId),
  };
}

export async function attachReviewStatsToMediaItems<
  T extends { id: string },
>(items: T[]): Promise<(T & { averageRating?: number; reviewCount?: number })[]> {
  const ids = items.map((m) => m.id).filter((id) => !id.startsWith("network-"));
  const statsMap = await getMediaReviewStatsForIds(ids);
  return items.map((item) => {
    const stats = statsMap.get(item.id);
    if (!stats || stats.reviewCount === 0) return item;
    return {
      ...item,
      averageRating: stats.averageRating,
      reviewCount: stats.reviewCount,
    };
  });
}
