/**
 * PR-6c — 브리프 스토어 + 카탈로그 → CampaignPlan 스냅샷.
 */

import type {
  CampaignPlanMediaLine,
  CampaignPlanMixEntry,
  CampaignPlanOnlineChannelLine,
  CampaignPlanOnlineExcludedEntry,
  CampaignPlanSnapshot,
  CampaignPlanStoredMetrics,
} from "@/lib/campaign-plan-schema";
import { snapshotWithEngineVersion } from "@/lib/campaign-plan-schema";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";
import { onlinePricingLabel } from "@/lib/pricing/online-performance-estimate";
import {
  briefCustomLineToSnapshotEntry,
  sumBriefCustomLinesTotalWon,
  type BriefCustomLine,
} from "@/lib/planner/brief/custom-lines";
import { MIN_IMPRESSIONS_FOR_CPM } from "@/lib/metrics/constants";
import { resolveMediaProductPrice } from "@/lib/metrics/media-price-adapter";
import type { MediaItem } from "@/lib/media-data";
import {
  calcMixMetrics,
  calcLineMetrics,
  type MixLine,
} from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import {
  BRIEF_DEFAULT_DAYS,
  flightDays,
  toCampaignPlanBrief,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";

export function buildMixLines(
  catalog: readonly MediaItem[],
  mixUnits: Record<string, number>,
): MixLine[] {
  const out: MixLine[] = [];
  for (const [mediaId, units] of Object.entries(mixUnits)) {
    if (units <= 0) continue;
    const media = catalog.find((m) => m.id === mediaId);
    if (media) out.push({ media, units });
  }
  return out;
}

export function buildCampaignPlanSnapshot(params: {
  brief: CampaignBriefInput;
  catalog: readonly MediaItem[];
  mixUnits: Record<string, number>;
  /** 카탈로그 외 수동 항목 — 스냅샷에 denormalize 저장 */
  customLines?: readonly BriefCustomLine[];
}): CampaignPlanSnapshot {
  const planBrief = toCampaignPlanBrief(params.brief);
  const days = flightDays(params.brief) ?? BRIEF_DEFAULT_DAYS;
  const lines = buildMixLines(params.catalog, params.mixUnits);
  const metrics = calcMixMetrics({
    lines,
    days,
    budgetWon: planBrief.budgetWon,
    target: briefToTargetSpec(params.brief),
  });

  const customLines = params.customLines ?? [];
  const catalogMix: CampaignPlanMediaLine[] = lines.map((line) => {
    const lineMetrics = calcLineMetrics(line, days);
    const price = resolveMediaProductPrice(line.media, days);
    let cpmWon: number | null = null;
    if (
      lineMetrics.impressions.value > 0 &&
      lineMetrics.impressions.value >= MIN_IMPRESSIONS_FOR_CPM &&
      lineMetrics.costWon &&
      lineMetrics.costWon.value > 0
    ) {
      const raw = Math.round(
        (lineMetrics.costWon.value / lineMetrics.impressions.value) * 1000,
      );
      cpmWon = raw > 0 ? raw : null;
    }
    return {
      mediaId: line.media.id,
      slug: line.media.slug ?? null,
      name: line.media.name,
      units: line.units,
      days,
      optionId: price?.option?.id,
      priceWon: lineMetrics.costWon?.value ?? 0,
      priceIsEstimate: lineMetrics.costWon?.basis !== "measured",
      impressions: lineMetrics.impressions.value,
      cpmWon,
    };
  });

  const customMix: CampaignPlanMixEntry[] = customLines.map((line) =>
    briefCustomLineToSnapshotEntry(line, days),
  );
  const mediaMix: CampaignPlanMixEntry[] = [...catalogMix, ...customMix];

  const customTotalWon = sumBriefCustomLinesTotalWon(customLines);
  const totalCostWon = metrics.totalCostWon.value + customTotalWon;
  const budgetWon = planBrief.budgetWon;
  const overBudgetWon = Math.max(0, totalCostWon - budgetWon);
  const budgetUsedRate = budgetWon > 0 ? totalCostWon / budgetWon : 0;
  /** 커스텀 항목은 impressions/cpm 없음 → 혼합 mix 시 CPM 산정 불가 */
  const mixCpmWon =
    customMix.length > 0 ? null : metrics.mixCpmWon.value;

  const storedMetrics: CampaignPlanStoredMetrics = {
    netReach: metrics.netReach?.value ?? 0,
    targetPopulation: 0,
    reachRate: metrics.reachRate?.value ?? 0,
    frequency: metrics.frequency?.value ?? 0,
    grp: metrics.grp?.value ?? 0,
    effectiveReach: 0,
    effectiveReachRate: 0,
    totalImpressions: metrics.totalImpressions.value,
    mixCpmWon,
    totalCostWon,
    overBudgetWon,
    budgetUsedRate,
    dataQuality: {
      totalCostWon: metrics.totalCostWon.basis,
      totalImpressions: metrics.totalImpressions.basis,
      mixCpmWon:
        mixCpmWon == null ? null : metrics.mixCpmWon.basis,
      netReach: metrics.netReach?.basis ?? null,
      reachRate: metrics.reachRate?.basis ?? null,
      frequency: metrics.frequency?.basis ?? null,
      grp: metrics.grp?.basis ?? null,
    },
  };

  return snapshotWithEngineVersion({
    brief: planBrief,
    mediaMix,
    metrics: storedMetrics,
  });
}

/**
 * digital_only 저장 — `recommendOnlineCatalogChannels()` 결과를 그대로
 * 스냅샷에 담는다. OOH `mediaMix`(수량 기반)와 데이터 모델이 달라 `mediaMix`는
 * 항상 빈 배열이고, 실제 내용은 `onlineRecommend`에 들어간다. 노출/도달/GRP 등
 * OOH 지표는 온라인 채널에 적용되는 개념이 아니므로 0 + `default` basis로
 * 정직하게 표기한다(있지도 않은 값을 만들어내지 않음).
 */
export function buildOnlineCampaignPlanSnapshot(params: {
  brief: CampaignBriefInput;
  result: OnlineCatalogRecommendResult;
  isKo: boolean;
}): CampaignPlanSnapshot {
  const planBrief = toCampaignPlanBrief(params.brief);
  const isKo = params.isKo;

  const channels: CampaignPlanOnlineChannelLine[] = params.result.platforms.map(
    (p) => ({
      platform: p.platform,
      productName: isKo ? p.topProduct.name : p.topProduct.nameEn || p.topProduct.name,
      mediaId: p.topProduct.id,
      score: p.score,
      budgetPct: p.budgetPct,
      budgetWon: p.budgetMan * 10_000,
      metricType: p.metricType,
      estimatedMetricMin: p.estimatedMetricMin,
      estimatedMetricMax: p.estimatedMetricMax,
      pricingLabel: p.topProduct.onlineSpec
        ? onlinePricingLabel(p.topProduct.onlineSpec)
        : isKo
          ? "문의"
          : "Inquiry",
      reasonKo: p.reasonKo,
      reasonEn: p.reasonEn,
    }),
  );

  const excludedForBudget: CampaignPlanOnlineExcludedEntry[] =
    params.result.excludedForBudget.map((e) => ({
      platform: e.platform,
      score: e.score,
      minBudgetMan: e.minBudgetMan,
      reasonKo: e.reasonKo,
      reasonEn: e.reasonEn,
    }));

  const totalBudgetWon = channels.reduce((s, c) => s + c.budgetWon, 0);
  const requestWon = planBrief.budgetWon;

  const storedMetrics: CampaignPlanStoredMetrics = {
    netReach: 0,
    targetPopulation: 0,
    reachRate: 0,
    frequency: 0,
    grp: 0,
    effectiveReach: 0,
    effectiveReachRate: 0,
    // OOH식 "노출" 집계 개념 자체가 온라인 채널엔 없음(플랫폼별 노출·클릭이
    // 섞여 있어 단일 합산이 무의미) — 실제 채널별 값은 onlineRecommend에 있음
    totalImpressions: 0,
    mixCpmWon: null,
    totalCostWon: totalBudgetWon,
    overBudgetWon: Math.max(0, totalBudgetWon - requestWon),
    budgetUsedRate: requestWon > 0 ? totalBudgetWon / requestWon : 0,
    dataQuality: {
      totalCostWon: "derived",
      totalImpressions: "default",
      mixCpmWon: null,
      netReach: null,
      reachRate: null,
      frequency: null,
      grp: null,
    },
  };

  return snapshotWithEngineVersion({
    brief: planBrief,
    mediaMix: [],
    metrics: storedMetrics,
    onlineRecommend: { totalBudgetWon, channels, excludedForBudget },
  });
}
