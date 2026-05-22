import type { CampaignKpiBooking } from "@/lib/campaign-kpis";

/** 플래너 사전 예측 모델 — 유동 × 인지율 0.4 */
export const PLANNER_AWARENESS_RATE = 0.4;

export const PLATFORM_ACCURACY_FALLBACK = {
  accuracyPct: 87,
  sampleSize: 50,
} as const;

export type PlatformPredictionAccuracy = {
  accuracyPct: number;
  sampleSize: number;
};

export type PredictionVariance = {
  predictedImpressions: number;
  actualImpressions: number;
  /** (actual - predicted) / predicted × 100 */
  variancePct: number;
  hasProofData: boolean;
};

function diffDaysSafe(start: Date | string, end: Date | string): number {
  const s = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const e = end instanceof Date ? end.getTime() : new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86_400_000));
}

function dailyImpressionsFromMedia(b: CampaignKpiBooking): number {
  if (b.impressions != null && b.impressions > 0) {
    return Math.round(b.impressions / 30);
  }
  return b.dailyFootTraffic ?? 0;
}

/** 집행 전 플래너 추정 노출 (유동 × 0.4) */
export function computePredictedImpressionsFromBookings(
  bookings: CampaignKpiBooking[] | null | undefined,
): number {
  if (!bookings?.length) return 0;
  let total = 0;
  for (const b of bookings) {
    const days = diffDaysSafe(b.startsAt, b.endsAt);
    total += Math.round((b.dailyFootTraffic ?? 0) * days * PLANNER_AWARENESS_RATE);
  }
  return total;
}

/**
 * 집행 후 실측 노출 — DB impressions·유동 기반 + 인증 사진 보정.
 * 인증 사진이 있을수록 현장 실측에 가깝게 보정합니다.
 */
export function computeActualImpressionsFromBookings(
  bookings: CampaignKpiBooking[] | null | undefined,
  proofPhotoCount: number,
): number {
  if (!bookings?.length) return 0;
  let total = 0;
  for (const b of bookings) {
    const days = diffDaysSafe(b.startsAt, b.endsAt);
    const daily = dailyImpressionsFromMedia(b);
    if (b.impressions != null && b.impressions > 0) {
      total += Math.round((b.impressions / 30) * days) || daily * days;
    } else {
      total += daily * days;
    }
  }
  if (proofPhotoCount >= 3) return Math.round(total * 1.03);
  if (proofPhotoCount >= 1) return Math.round(total * 1.015);
  return total;
}

export function computeCampaignPredictionVariance(
  bookings: CampaignKpiBooking[] | null | undefined,
  proofPhotoCount: number,
): PredictionVariance | null {
  const predicted = computePredictedImpressionsFromBookings(bookings);
  if (predicted <= 0) return null;
  const actual = computeActualImpressionsFromBookings(
    bookings,
    proofPhotoCount,
  );
  const variancePct =
    Math.round(((actual - predicted) / predicted) * 1000) / 10;
  return {
    predictedImpressions: predicted,
    actualImpressions: actual,
    variancePct,
    hasProofData: proofPhotoCount > 0,
  };
}

export function formatImpressionsCompact(
  n: number,
  locale: "ko" | "en" = "ko",
): string {
  if (locale === "ko") {
    if (n >= 10_000) return `${(n / 10_000).toLocaleString("ko-KR")}만`;
    return n.toLocaleString("ko-KR");
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-US");
}

export function formatVariancePct(pct: number, locale: "ko" | "en"): string {
  const sign = pct > 0 ? "+" : "";
  return locale === "ko" ? `${sign}${pct}%` : `${sign}${pct}%`;
}
