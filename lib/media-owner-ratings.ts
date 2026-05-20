import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { isMissingContentTableError } from "@/lib/prisma-content-guards";

export type MediaOwnerReviewInput = {
  ownerUserId: string;
  reviewerUserId?: string | null;
  campaignId?: string | null;
  oohQuoteId?: string | null;
  responseSpeed: number;
  materialAccuracy: number;
  executionQuality: number;
  proofPhotoProvided: number;
  comment?: string | null;
};

function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export function computeOverallRating(scores: {
  responseSpeed: number;
  materialAccuracy: number;
  executionQuality: number;
  proofPhotoProvided: number;
}): number {
  const avg =
    (scores.responseSpeed +
      scores.materialAccuracy +
      scores.executionQuality +
      scores.proofPhotoProvided) /
    4;
  return Math.round(avg * 10) / 10;
}

export async function submitMediaOwnerReview(
  input: MediaOwnerReviewInput,
): Promise<{ id: string; overallRating: number } | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();

  const scores = {
    responseSpeed: clampScore(input.responseSpeed),
    materialAccuracy: clampScore(input.materialAccuracy),
    executionQuality: clampScore(input.executionQuality),
    proofPhotoProvided: clampScore(input.proofPhotoProvided),
  };
  const overallRating = computeOverallRating(scores);

  try {
    const review = await db.mediaOwnerReview.create({
      data: {
        ownerUserId: input.ownerUserId,
        reviewerUserId: input.reviewerUserId ?? null,
        campaignId: input.campaignId ?? null,
        oohQuoteId: input.oohQuoteId ?? null,
        ...scores,
        overallRating,
        comment: input.comment?.trim() || null,
      },
    });

    const agg = await db.mediaOwnerReview.aggregate({
      where: { ownerUserId: input.ownerUserId },
      _avg: { overallRating: true },
      _count: true,
    });

    await db.mediaOwnerStats.upsert({
      where: { ownerUserId: input.ownerUserId },
      create: {
        ownerUserId: input.ownerUserId,
        avgRating: overallRating,
        reviewCount: 1,
      },
      update: {
        avgRating: agg._avg.overallRating ?? overallRating,
        reviewCount: agg._count,
      },
    });

    return { id: review.id, overallRating };
  } catch (e) {
    if (isMissingContentTableError(e)) return null;
    throw e;
  }
}

export async function getMediaOwnerPublicProfile(ownerUserId: string): Promise<{
  avgRating: number | null;
  reviewCount: number;
  avgResponseMinutes: number | null;
  tier: string;
} | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  try {
    const stats = await db.mediaOwnerStats.findUnique({
      where: { ownerUserId },
    });
    if (!stats) {
      return {
        avgRating: null,
        reviewCount: 0,
        avgResponseMinutes: null,
        tier: "BRONZE",
      };
    }
    return {
      avgRating: stats.avgRating,
      reviewCount: stats.reviewCount,
      avgResponseMinutes: stats.avgResponseMinutes,
      tier: stats.tier,
    };
  } catch (e) {
    if (isMissingContentTableError(e)) return null;
    throw e;
  }
}

export function formatResponseTime(minutes: number | null, isKo = true): string {
  if (minutes == null) return isKo ? "—" : "—";
  if (minutes < 60) return isKo ? `${minutes}분` : `${minutes}m`;
  const h = Math.round(minutes / 60);
  return isKo ? `${h}시간` : `${h}h`;
}
