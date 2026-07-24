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
  /** 플래너형 예측 (유동 × 0.4) — 리포트 생성 시점 재계산 */
  predictedImpressions: number;
  /** 검증된 추정치 (유동/impressions + 사진 보정). 센서 실측 아님 */
  actualImpressions: number;
  /** (verified - predicted) / predicted × 100 */
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
 * 집행 후 검증된 추정치 — DB impressions·유동 기반 + 인증 사진 보정.
 * 센서 절대 실측이 아님. 사진이 있으면 소폭(+1.5~3%) 보정.
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
