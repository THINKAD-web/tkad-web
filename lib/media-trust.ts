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
    labelKo: "즉시 예약(안내)",
    labelEn: "Instant book (info)",
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

function hashMediaIdStable(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type PublicExecutionEstimateInput = Pick<
  MediaItem,
  "region" | "city" | "price" | "visibilityScore"
>;

/** DB 집행 이력 없을 때 공개 UI용 추정치(매체 ID 기준 고정) */
export function estimatePublicExecutionStats(
  mediaId: string,
  media?: PublicExecutionEstimateInput,
): MediaExecutionStats {
  const h = hashMediaIdStable(mediaId);
  let count = 18 + (h % 52);

  const regionText = `${media?.region ?? ""} ${media?.city ?? ""}`.toLowerCase();
  if (regionText.includes("seoul") || regionText.includes("서울")) {
    count += 10 + (h % 15);
  }
  if ((media?.visibilityScore ?? 0) >= 70) {
    count += 8 + (h % 10);
  }
  if ((media?.price ?? 0) >= 5_000_000) {
    count += 6 + (h % 8);
  }

  count = Math.min(Math.max(count, 12), 128);

  const monthsSinceLast = h % 3;
  const lastExecutionAt = new Date();
  lastExecutionAt.setHours(12, 0, 0, 0);
  lastExecutionAt.setMonth(lastExecutionAt.getMonth() - monthsSinceLast);
  lastExecutionAt.setDate(Math.min(28, 1 + (h % 27)));

  return {
    totalCount: count,
    lastExecutionAt,
    monthsSinceLast,
  };
}

/** 실제 집행 데이터 우선, 없으면 공개 추정치 */
export function resolvePublicExecutionStats(
  mediaId: string,
  raw: MediaExecutionStats,
  media?: PublicExecutionEstimateInput,
): MediaExecutionStats {
  if (raw.totalCount > 0) return raw;
  return estimatePublicExecutionStats(mediaId, media);
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
  /** Kept for call-site compatibility; badge retired with performance-guarantee policy. */
  _certifiedPhotoCount = 0,
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

export type MediaTrustScoreGrade = "excellent" | "good" | "average" | "new";

/** 100점 만점 신뢰 점수 → 등급 (표시용 — 산식 변경 없음) */
export function trustScoreToGrade(score: number): MediaTrustScoreGrade {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "new";
}

export function trustGradeLabel(grade: MediaTrustScoreGrade, isKo: boolean): string {
  if (isKo) {
    switch (grade) {
      case "excellent":
        return "우수";
      case "good":
        return "양호";
      case "average":
        return "보통";
      case "new":
        return "신규";
    }
  }
  switch (grade) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "average":
      return "Fair";
    case "new":
      return "New";
  }
}

export function trustScoreExplanation(isKo: boolean): string {
  return isKo
    ? "집행 이력·리뷰·데이터 완성도 기반 산정"
    : "Based on execution history, reviews, and data completeness";
}

export function trustGradeToneClass(grade: MediaTrustScoreGrade): string {
  switch (grade) {
    case "excellent":
      return "text-emerald-700 dark:text-emerald-300 border-emerald-400/40 bg-emerald-400/10";
    case "good":
      return "text-[color:var(--qp-accent)] border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)]";
    case "average":
      return "text-amber-800 dark:text-amber-200 border-amber-400/40 bg-amber-400/10";
    case "new":
      return "text-muted-foreground border-border/60 bg-muted/40";
  }
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
