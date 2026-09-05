/**
 * O-1 / PART3-5 — digital_only 결과 화면 KPI 그리드 집계.
 *
 * impressions(CPM 기반)와 clicks(CPC 기반)는 단위가 달라 합산할 수 없으므로
 * metricType별로 따로 합산한다. 단가 정보가 아예 없는 채널(min=max=0)은
 * 합계에 0으로 정직하게 반영되지만, 몇 개 채널이 실제 단가를 갖고 있는지도
 * 함께 세어 "일부 채널은 추정 불가" 사실을 감추지 않는다.
 */

import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";

export type OnlineMetricKpi = {
  min: number;
  max: number;
  /** 이 지표 유형(impressions|clicks)에 속한 채널 수 */
  channelCount: number;
  /** 그중 실제 단가 정보가 있어 0이 아닌 추정치를 낸 채널 수 */
  channelsWithRateCount: number;
};

export type OnlineResultKpis = {
  channelCount: number;
  totalBudgetMan: number;
  impressions: OnlineMetricKpi | null;
  clicks: OnlineMetricKpi | null;
};

export function summarizeOnlineResultKpis(
  result: OnlineCatalogRecommendResult,
): OnlineResultKpis {
  let impMin = 0;
  let impMax = 0;
  let impCount = 0;
  let impWithRate = 0;
  let clkMin = 0;
  let clkMax = 0;
  let clkCount = 0;
  let clkWithRate = 0;

  for (const p of result.platforms) {
    const hasRate = !(p.estimatedMetricMin === 0 && p.estimatedMetricMax === 0);
    if (p.metricType === "impressions") {
      impMin += p.estimatedMetricMin;
      impMax += p.estimatedMetricMax;
      impCount += 1;
      if (hasRate) impWithRate += 1;
    } else {
      clkMin += p.estimatedMetricMin;
      clkMax += p.estimatedMetricMax;
      clkCount += 1;
      if (hasRate) clkWithRate += 1;
    }
  }

  return {
    channelCount: result.platforms.length,
    totalBudgetMan: result.platforms.reduce((s, p) => s + p.budgetMan, 0),
    impressions:
      impCount > 0
        ? { min: impMin, max: impMax, channelCount: impCount, channelsWithRateCount: impWithRate }
        : null,
    clicks:
      clkCount > 0
        ? { min: clkMin, max: clkMax, channelCount: clkCount, channelsWithRateCount: clkWithRate }
        : null,
  };
}
