import type { MediaItem } from "@/lib/media-data";
import { isInstantBookingEligible } from "@/lib/instant-booking-eligibility";

export type MediaTrustBadgeId =
  | "popular"
  | "instant_booking"
  | "verified_execution"
  | "new"
  | "hot_week";

export type MediaTrustBadge = {
  id: MediaTrustBadgeId;
  emoji: string;
  labelKo: string;
  labelEn: string;
};

export type MediaExecutionStats = {
  totalCount: number;
  lastExecutionAt: Date | null;
  monthsSinceLast: number | null;
};

export type MediaTrustBadgeContext = {
  topInquiryIds: ReadonlySet<string>;
  hotWeekIds: ReadonlySet<string>;
};

const BADGE_DEFS: Record<
  MediaTrustBadgeId,
  Omit<MediaTrustBadge, "id">
> = {
  popular: {
    emoji: "🏆",
    labelKo: "인기 매체",
    labelEn: "Popular",
  },
  instant_booking: {
    emoji: "⚡",
    labelKo: "즉시 예약",
    labelEn: "Instant book",
  },
  verified_execution: {
    emoji: "✅",
    labelKo: "집행 검증",
    labelEn: "Verified flights",
  },
  new: {
    emoji: "🆕",
    labelKo: "신규 등록",
    labelEn: "New listing",
  },
  hot_week: {
    emoji: "🔥",
    labelKo: "이번 주 핫",
    labelEn: "Hot this week",
  },
};

function badge(id: MediaTrustBadgeId): MediaTrustBadge {
  return { id, ...BADGE_DEFS[id] };
}

export function isMediaNewListing(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() <= 30 * 86400_000;
}

export function monthsSince(date: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

export function formatLastExecutionLabel(
  monthsAgo: number | null,
  isKo: boolean,
): string {
  if (monthsAgo == null) {
    return isKo ? "최근 집행 이력 없음" : "No recent flights";
  }
  if (monthsAgo <= 0) {
    return isKo ? "최근 집행 1개월 이내" : "Flights within 1 month";
  }
  return isKo
    ? `최근 집행 ${monthsAgo}개월 전`
    : `Last flight ${monthsAgo} mo ago`;
}

export function computeTrustBadges(
  media: MediaItem,
  ctx: MediaTrustBadgeContext,
  execution: MediaExecutionStats,
): MediaTrustBadge[] {
  const badges: MediaTrustBadge[] = [];

  if (ctx.topInquiryIds.has(media.id)) badges.push(badge("popular"));
  if (isInstantBookingEligible(media).eligible) {
    badges.push(badge("instant_booking"));
  }
  if (execution.totalCount > 0) badges.push(badge("verified_execution"));
  if (isMediaNewListing(media.createdAt)) badges.push(badge("new"));
  if (ctx.hotWeekIds.has(media.id)) badges.push(badge("hot_week"));

  return badges;
}

function imageCount(media: MediaItem): number {
  const samples = media.sampleImages?.length ?? 0;
  const cases = media.caseStudyPhotos?.length ?? 0;
  return Math.max(samples, cases);
}

function dataCompletenessScore(media: MediaItem): number {
  const checks = [
    Boolean(media.catalogDescription?.trim() || media.description?.trim()),
    media.lat != null && media.lng != null,
    media.price > 0,
    imageCount(media) > 0,
    Boolean(media.operatingHours?.trim()),
    Boolean(media.targetAge?.trim() || media.features?.trim()),
    Boolean(media.trafficPattern),
    Boolean(media.district?.trim() || media.location?.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  return (filled / checks.length) * 20;
}

function responseSpeedScore(minutes: number | null | undefined): number {
  if (minutes == null) return 10;
  if (minutes <= 60) return 20;
  if (minutes <= 240) return 15;
  if (minutes <= 1440) return 10;
  if (minutes <= 4320) return 5;
  return 0;
}

/** 1–100 신뢰 점수 (가중치 합) */
export function computeTrustScore(
  media: MediaItem,
  execution: MediaExecutionStats,
  ownerResponseMinutes: number | null | undefined,
): number {
  const executionPts = Math.min(execution.totalCount / 5, 1) * 30;
  const reviewPts =
    media.reviewCount && media.reviewCount > 0 && media.averageRating
      ? (media.averageRating / 5) * 20
      : 0;
  const imagePts = Math.min(imageCount(media) / 4, 1) * 10;
  const completenessPts = dataCompletenessScore(media);
  const responsePts = responseSpeedScore(ownerResponseMinutes);

  const raw =
    executionPts + reviewPts + imagePts + completenessPts + responsePts;
  return Math.max(1, Math.min(100, Math.round(raw)));
}

export function trustBadgeLabel(b: MediaTrustBadge, isKo: boolean): string {
  return `${b.emoji} ${isKo ? b.labelKo : b.labelEn}`;
}

/** 썸네일 등 좁은 영역 — 우선순위 상위 N개 */
export function pickTrustBadgesForThumbnail(
  badges: MediaTrustBadge[] | undefined,
  max = 2,
): MediaTrustBadge[] {
  if (!badges?.length) return [];
  const order: MediaTrustBadgeId[] = [
    "instant_booking",
    "popular",
    "hot_week",
    "verified_execution",
    "new",
  ];
  const sorted = [...badges].sort(
    (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
  );
  return sorted.slice(0, max);
}
