/**
 * 예산 초과 mix — Option A(예산 내 자동 구성) vs Option B(현재 mix 유지).
 *
 * Option A 는 `buildRecommendedMix` / `rebuildBriefRecommendedMix` 만 사용한다.
 * 별도 그리디 경로를 두지 않는다.
 */

import type { MediaItem } from "@/lib/media-data";
import type { PlannerExportAppendixMediaSpec } from "@/lib/planner-report-export/types";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import { MIN_IMPRESSIONS_FOR_CPM } from "@/lib/metrics/constants";
import {
  calcMixMetrics,
  calcLineMetrics,
  type MixLine,
} from "@/lib/planner/brief/mix-metrics";
import { briefToTargetSpec } from "@/lib/planner/brief/reach-adapter";
import { rebuildBriefRecommendedMix } from "@/lib/planner/brief/rebuild-mix";
import { buildMixLines } from "@/lib/planner/brief/build-plan-snapshot";
import {
  BRIEF_DEFAULT_DAYS,
  flightDays,
  totalBudgetWon,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { budgetUsedPct, formatWonAmount } from "@/lib/planner/brief/over-budget-copy";

export type OverBudgetExcludedMedia = {
  mediaId: string;
  name: string;
  units: number;
  costWon: number;
};

export type OverBudgetMixOptionSummary = {
  mediaCount: number;
  totalCostWon: number;
  mixCpmWon: number | null;
  budgetUsedRate: number;
  overBudgetWon: number;
  overPct: number;
};

export type OverBudgetChoice = {
  budgetWon: number;
  optionA: OverBudgetMixOptionSummary & {
    mixLines: readonly { mediaId: string; units: number }[];
    mixUnits: Record<string, number>;
  };
  optionB: OverBudgetMixOptionSummary & {
    mixUnits: Record<string, number>;
  };
  excludedFromOptionA: OverBudgetExcludedMedia[];
};

function mixUnitsFromLines(
  lines: readonly { mediaId: string; units: number }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) {
    const n = Math.floor(l.units);
    if (Number.isFinite(n) && n > 0) out[l.mediaId] = n;
  }
  return out;
}

function summarizeMix(
  lines: MixLine[],
  days: number,
  budgetWon: number,
  target: ReturnType<typeof briefToTargetSpec>,
): OverBudgetMixOptionSummary {
  const metrics = calcMixMetrics({ lines, days, budgetWon, target });
  const overPct =
    budgetWon > 0
      ? Math.max(0, Math.round((metrics.overBudgetWon / budgetWon) * 100))
      : 0;
  return {
    mediaCount: lines.length,
    totalCostWon: metrics.totalCostWon.value,
    mixCpmWon: metrics.mixCpmWon.value,
    budgetUsedRate: metrics.budgetUsedRate,
    overBudgetWon: metrics.overBudgetWon,
    overPct,
  };
}

/** 현재 mix 가 예산을 초과할 때만 Option A/B 비교를 반환한다. */
export function resolveOverBudgetChoice(params: {
  brief: CampaignBriefInput;
  catalog: readonly MediaItem[];
  mixUnits: Record<string, number>;
  isKo?: boolean;
}): OverBudgetChoice | null {
  const budgetWon = totalBudgetWon(params.brief);
  if (budgetWon <= 0) return null;

  const days = flightDays(params.brief) ?? BRIEF_DEFAULT_DAYS;
  const target = briefToTargetSpec(params.brief);
  const currentLines = buildMixLines(params.catalog, params.mixUnits);
  if (currentLines.length === 0) return null;

  const currentMetrics = calcMixMetrics({
    lines: currentLines,
    days,
    budgetWon,
    target,
  });
  if (!currentMetrics.isOverBudget) return null;

  const optionALines = rebuildBriefRecommendedMix({
    brief: params.brief,
    catalog: params.catalog,
    isKo: params.isKo,
    preserveMixUnits: params.mixUnits,
  });
  const optionAUnits = mixUnitsFromLines(optionALines);
  const optionABuilt = buildMixLines(params.catalog, optionAUnits);

  const optionAIds = new Set(optionALines.map((l) => l.mediaId));
  const excludedFromOptionA: OverBudgetExcludedMedia[] = [];
  for (const line of currentLines) {
    if (optionAIds.has(line.media.id)) continue;
    const lm = calcLineMetrics(line, days);
    excludedFromOptionA.push({
      mediaId: line.media.id,
      name: line.media.name,
      units: line.units,
      costWon: lm.costWon?.value ?? 0,
    });
  }

  return {
    budgetWon,
    optionA: {
      ...summarizeMix(optionABuilt, days, budgetWon, target),
      mixLines: optionALines,
      mixUnits: optionAUnits,
    },
    optionB: {
      ...summarizeMix(currentLines, days, budgetWon, target),
      mixUnits: { ...params.mixUnits },
    },
    excludedFromOptionA,
  };
}

export function formatOverBudgetOptionLine(
  summary: OverBudgetMixOptionSummary,
  budgetWon: number,
  isKo: boolean,
  opts?: { showOverPct?: boolean },
): string {
  const countLabel = isKo
    ? `${summary.mediaCount}매체`
    : `${summary.mediaCount} media`;
  const budgetLabel = formatWonAmount(budgetWon, isKo);
  const costLabel = formatWonAmount(summary.totalCostWon, isKo);
  const cpmPart =
    summary.mixCpmWon != null
      ? isKo
        ? ` · CPM ${formatWonAmount(summary.mixCpmWon, isKo)}`
        : ` · CPM ${formatWonAmount(summary.mixCpmWon, isKo)}`
      : "";
  const overPart =
    opts?.showOverPct && summary.overBudgetWon > 0
      ? isKo
        ? ` (+${summary.overPct}%)`
        : ` (+${summary.overPct}%)`
      : "";
  return isKo
    ? `${countLabel} · ${costLabel} / ${budgetLabel}${cpmPart}${overPart}`
    : `${countLabel} · ${costLabel} / ${budgetLabel}${cpmPart}${overPart}`;
}

/** PDF 부록 — 현재 mix 대비 Option A 에서 빠진 매체 (inquiry appendix 패턴) */
export function buildPlannerOverBudgetAppendixSpecs(args: {
  brief: CampaignBriefInput;
  catalog: readonly MediaItem[];
  mixUnits: Record<string, number>;
  isKo: boolean;
}): PlannerExportAppendixMediaSpec[] | undefined {
  const choice = resolveOverBudgetChoice(args);
  if (!choice || choice.excludedFromOptionA.length === 0) return undefined;

  const days = flightDays(args.brief) ?? BRIEF_DEFAULT_DAYS;
  const statusNote = args.isKo
    ? "예산 내 자동 구성에서 제외"
    : "Excluded from within-budget auto mix";

  return choice.excludedFromOptionA.map((row) => {
    const media = args.catalog.find((m) => m.id === row.mediaId);
    const line: MixLine | null = media
      ? { media, units: row.units }
      : null;
    let cpmLabel = "—";
    let priceLabel = formatExportBudgetWonLabel(row.costWon, args.isKo);
    let location = "—";
    if (line) {
      const lm = calcLineMetrics(line, days);
      if (lm.costWon) {
        priceLabel = formatExportBudgetWonLabel(lm.costWon.value, args.isKo);
      }
      if (
        lm.impressions.value >= MIN_IMPRESSIONS_FOR_CPM &&
        lm.costWon &&
        lm.costWon.value > 0
      ) {
        const cpm = Math.round(
          (lm.costWon.value / lm.impressions.value) * 1000,
        );
        if (cpm > 0) {
          cpmLabel = formatWonAmount(cpm, args.isKo);
        }
      }
      location =
        (args.isKo ? media!.location : media!.locationEn || media!.location) ||
        "—";
    }
    return {
      id: row.mediaId,
      name: row.name,
      priceLabel,
      cpmLabel,
      location,
      reviewStatusLabel: "—",
      inBody: true,
      statusNote,
    };
  });
}

export { budgetUsedPct };
