/**
 * 캠페인 실측 실적(노출·도달) 공통 헬퍼.
 * 어드민·매체사 입력 API 와 광고주 대시보드 '예측 vs 실제' 표시에서 공유.
 * 서버·클라이언트 모두에서 import 가능 (외부 의존성 없음).
 */

export type CampaignActualMetricKey = "actualImpressions" | "actualReach";

/** 입력값을 0 이상의 정수로 정규화. 빈 값·음수·NaN → null. */
export function parseActualMetric(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export type MetricVariance = {
  predicted: number;
  actual: number | null;
  /** (actual - predicted) / predicted × 100. 실측·예측이 유효할 때만. */
  variancePct: number | null;
};

/** 예측 대비 실측 변동률 계산. */
export function computeMetricVariance(
  predicted: number,
  actual: number | null | undefined,
): MetricVariance {
  if (actual == null || predicted <= 0) {
    return { predicted, actual: actual ?? null, variancePct: null };
  }
  const variancePct = Math.round(((actual - predicted) / predicted) * 1000) / 10;
  return { predicted, actual, variancePct };
}

export function formatActualSource(
  source: string | null | undefined,
  isKo: boolean,
): string {
  if (source === "admin") return isKo ? "관리자 입력" : "Admin";
  if (source === "media_owner") return isKo ? "매체사 입력" : "Media owner";
  return isKo ? "수기 입력" : "Manual";
}
