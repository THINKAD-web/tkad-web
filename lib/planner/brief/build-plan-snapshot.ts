/**
 * PR-6c — 브리프 스토어 + 카탈로그 → CampaignPlan 스냅샷.
 */

import type {
  CampaignPlanMediaLine,
  CampaignPlanMixEntry,
  CampaignPlanSnapshot,
  CampaignPlanStoredMetrics,
} from "@/lib/campaign-plan-schema";
import { snapshotWithEngineVersion } from "@/lib/campaign-plan-schema";
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
