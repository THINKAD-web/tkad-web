import {
  resolveTrafficPattern,
  type StoredTrafficPattern,
} from "@/lib/media-traffic-estimate";

export type AggregatedTrafficPattern = {
  hourly: number[];
  weekly: number[];
  monthly: number[];
  /** 모든 매체에서 stored 패턴이 있었는지 여부 (false 면 일부/전체가 추정치) */
  allReal: boolean;
  /** 합산 일유동(절대값) */
  totalDailyFootfall: number;
};

/**
 * 포트폴리오의 매체들로부터 시간대·요일·월별 패턴을 집계.
 * 각 매체의 패턴을 일유동인구 가중평균으로 합쳐 정규화.
 */
export function aggregatePortfolioTraffic(
  portfolio: {
    type: string;
    region: string;
    dailyFootTraffic?: number;
    trafficPattern?: StoredTrafficPattern | null;
  }[],
): AggregatedTrafficPattern {
  const hourly = new Array(24).fill(0);
  const weekly = new Array(7).fill(0);
  const monthly = new Array(12).fill(0);
  let allReal = true;
  let totalDaily = 0;

  for (const m of portfolio) {
    const w = Math.max(1, m.dailyFootTraffic ?? 1);
    totalDaily += m.dailyFootTraffic ?? 0;
    const { pattern, isEstimated } = resolveTrafficPattern(
      m.trafficPattern ?? null,
      m.type,
      m.region,
    );
    if (isEstimated) allReal = false;
    for (let i = 0; i < 24; i++) hourly[i] += pattern.hourly[i] * w;
    for (let i = 0; i < 7; i++) weekly[i] += pattern.weekly[i] * w;
    for (let i = 0; i < 12; i++) monthly[i] += pattern.monthly[i] * w;
  }

  function norm(arr: number[]): number[] {
    const sum = arr.reduce((a, b) => a + b, 0);
    if (sum <= 0) return arr.map(() => 1 / arr.length);
    return arr.map((v) => v / sum);
  }

  return {
    hourly: norm(hourly),
    weekly: norm(weekly),
    monthly: norm(monthly),
    allReal,
    totalDailyFootfall: totalDaily,
  };
}
