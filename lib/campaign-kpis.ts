/**
 * 캠페인 KPI 산식 — admin preview / server PDF 양쪽에서 공유.
 *
 * IMPORTANT: 이 모듈은 *기존 `components/campaign-report-preview.tsx` 안에 있던
 * 산식을 그대로 추출* 한 것. 새로운 분석/AI 생성 X. 가정값(평균 빈도 6, 인지율
 * 0.4, 코어 인구 5천만 등) 모두 기존 그대로.
 *
 * Server-side (Node) 와 client-side (브라우저) 모두 import 가능 — 외부 의존 없음.
 */

export type CampaignKpiBooking = {
  startsAt: Date | string;
  endsAt: Date | string;
  dailyFootTraffic?: number | null;
  impressions?: number | null;
  type?: string | null;
  region?: string | null;
  visibilityScore?: number | null;
  location?: string | null;
};

export type CampaignKpiFinancial = {
  amountKrw?: number | null;
};

export type CampaignKpiInput = {
  mediaBookings?: CampaignKpiBooking[] | null;
  financialDocs?: CampaignKpiFinancial[] | null;
};

export type CampaignBaseStats = {
  totalExposure: number;
  totalDays: number;
  mediaCount: number;
  avgDaily: number;
  maxDays: number;
  totalImpressions: number;
};

export type CampaignPlannerKpis = {
  totalImp: number;
  avgFrequency: number;
  reach: number;
  reachCorePct: number;
  reachExtendedPct: number;
  blendedCpm: number | null;
  roiExpected: number | null;
  dailyImpressionsAvg: number;
};

export type CampaignKpis = {
  stats: CampaignBaseStats | null;
  plannerKpis: CampaignPlannerKpis | null;
  totalAmountKrw: number;
  avgVisibility: number | null;
};

function diffDaysSafe(start: Date | string, end: Date | string): number {
  const s = start instanceof Date ? start.getTime() : new Date(start).getTime();
  const e = end instanceof Date ? end.getTime() : new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86_400_000));
}

/** 기본 집계 — 매체 수 / 일수 / 노출·임프레션 합산 / 일평균. */
export function computeCampaignBaseStats(
  bookings: CampaignKpiBooking[] | null | undefined,
): CampaignBaseStats | null {
  if (!bookings?.length) return null;
  let totalExposure = 0;
  let totalDays = 0;
  let totalImpressions = 0;
  for (const b of bookings) {
    const days = diffDaysSafe(b.startsAt, b.endsAt);
    totalExposure += (b.dailyFootTraffic ?? 0) * days;
    totalDays += days;
    totalImpressions += (b.impressions ?? 0) * days;
  }
  const avgDaily = totalDays > 0 ? Math.round(totalExposure / totalDays) : 0;
  const maxDays = Math.max(...bookings.map((b) => diffDaysSafe(b.startsAt, b.endsAt)));
  return {
    totalExposure,
    totalDays,
    mediaCount: bookings.length,
    avgDaily,
    maxDays,
    totalImpressions,
  };
}

/**
 * Planner 스타일 추정 KPI (도달·빈도·CPM·ROI).
 * 가정값:
 *   - 인지율 0.4 (impressions 미설정 시 dailyFootTraffic 기반 폴백)
 *   - 평균 빈도 6 (월 단위 OOH 통계 평균)
 *   - 코어 인구 5,000만 (전국)
 *   - 확장 도달률 = 코어 × 1.6 (SNS·온라인 가산)
 */
export function computeCampaignPlannerKpis(
  stats: CampaignBaseStats | null,
  totalAmountKrw: number,
): CampaignPlannerKpis | null {
  if (!stats) return null;
  const totalImp =
    stats.totalImpressions > 0
      ? stats.totalImpressions
      : Math.round(stats.totalExposure * 0.4);
  const avgFrequency = 6;
  const reach = totalImp > 0 ? Math.round(totalImp / avgFrequency) : 0;
  const corePopulation = 50_000_000;
  const reachCorePct = Math.min(
    100,
    Math.round((reach / corePopulation) * 100 * 10) / 10,
  );
  const reachExtendedPct = Math.min(100, Math.round(reachCorePct * 1.6 * 10) / 10);
  const blendedCpm =
    totalAmountKrw > 0 && totalImp > 0
      ? Math.round((totalAmountKrw / totalImp) * 1000)
      : null;
  const roiExpected =
    totalAmountKrw > 0 ? Math.round((totalImp / totalAmountKrw) * 100_000_000) : null;
  const dailyImpressionsAvg =
    stats.totalDays > 0 ? Math.round(totalImp / stats.totalDays) : 0;
  return {
    totalImp,
    avgFrequency,
    reach,
    reachCorePct,
    reachExtendedPct,
    blendedCpm,
    roiExpected,
    dailyImpressionsAvg,
  };
}

export function computeCampaignTotalAmount(
  financialDocs: CampaignKpiFinancial[] | null | undefined,
): number {
  return financialDocs?.reduce((s, f) => s + (f.amountKrw ?? 0), 0) ?? 0;
}

export function computeAvgVisibility(
  bookings: CampaignKpiBooking[] | null | undefined,
): number | null {
  const scores = (bookings ?? [])
    .map((b) => b.visibilityScore)
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10) / 10;
}

/** 모두 한 번에 — admin preview / server PDF 공통 진입점. */
export function computeCampaignKpis(input: CampaignKpiInput): CampaignKpis {
  const stats = computeCampaignBaseStats(input.mediaBookings);
  const totalAmountKrw = computeCampaignTotalAmount(input.financialDocs);
  const plannerKpis = computeCampaignPlannerKpis(stats, totalAmountKrw);
  const avgVisibility = computeAvgVisibility(input.mediaBookings);
  return { stats, plannerKpis, totalAmountKrw, avgVisibility };
}
