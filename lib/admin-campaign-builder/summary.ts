import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import {
  aggregatePerformanceEstimates,
  totalBudgetWon,
  type AggregatedPerformance,
} from "@/lib/admin-campaign-builder/aggregate-kpis";
import { formatKpiRange } from "@/lib/admin-campaign-builder/format";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import {
  estimatePerformance,
  type OnlineSpecRates,
} from "@/lib/pricing/online-performance-estimate";

export type BuilderReportSummary = {
  totalBudgetWon: number;
  lineCount: number;
  digitalLineCount: number;
  oohLineCount: number;
  customLineCount: number;
  aggregate: AggregatedPerformance;
  reachLabel: string | null;
  clicksLabel: string | null;
  budgetChart: PlannerExportChartDatum[];
};

function toOnlineSpecRates(view: PublicMediaView): OnlineSpecRates {
  return {
    cpcMin: view.cpcMin,
    cpcMax: view.cpcMax,
    cpmMin: view.cpmMin,
    cpmMax: view.cpmMax,
    minBudget: view.minBudget ?? 0,
  };
}

function aggregateLabels(aggregate: AggregatedPerformance) {
  return {
    reachLabel:
      aggregate.reachMin != null && aggregate.reachMax != null
        ? formatKpiRange(aggregate.reachMin, aggregate.reachMax)
        : null,
    clicksLabel:
      aggregate.clicksMin != null && aggregate.clicksMax != null
        ? formatKpiRange(aggregate.clicksMin, aggregate.clicksMax)
        : null,
  };
}

function buildBudgetChart(
  payload: CampaignBuilderPayload,
  catalogBySlug?: Map<string, Pick<PublicMediaView, "nameKo" | "platform">>,
): PlannerExportChartDatum[] {
  if (payload.digitalLines.length === 0) return [];

  const bySlug = new Map<string, number>();
  for (const line of payload.digitalLines) {
    bySlug.set(line.slug, (bySlug.get(line.slug) ?? 0) + line.budgetWon);
  }

  const total = [...bySlug.values()].reduce((s, v) => s + v, 0);
  return [...bySlug.entries()].map(([slug, value], index) => {
    const media = catalogBySlug?.get(slug);
    return {
      label: media?.nameKo ?? slug,
      value,
      colorKey: "digital",
      pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    };
  });
}

export function summarizeBuilderReport(
  payload: CampaignBuilderPayload,
  catalogBySlug?: Map<string, Pick<PublicMediaView, "nameKo" | "platform">>,
): BuilderReportSummary {
  const digitalEstimates = payload.digitalLines.map((line) => {
    const view = catalogBySlug?.get(line.slug);
    const spec = view ? toOnlineSpecRates(view) : null;
    return { spec, budgetWon: line.budgetWon };
  });

  const aggregate = aggregatePerformanceEstimates(digitalEstimates);
  const labels = aggregateLabels(aggregate);

  return {
    totalBudgetWon: totalBudgetWon(payload),
    lineCount:
      payload.digitalLines.length +
      payload.oohLines.length +
      payload.customLines.length,
    digitalLineCount: payload.digitalLines.length,
    oohLineCount: payload.oohLines.length,
    customLineCount: payload.customLines.length,
    aggregate,
    reachLabel: labels.reachLabel,
    clicksLabel: labels.clicksLabel,
    budgetChart: buildBudgetChart(payload, catalogBySlug),
  };
}

/** Budget delta per channel (union of slugs) for A/B compare donut. */
export function diffChannelComposition(
  a: CampaignBuilderPayload,
  b: CampaignBuilderPayload,
  catalogBySlug?: Map<string, Pick<PublicMediaView, "nameKo">>,
): PlannerExportChartDatum[] {
  const slugs = new Set([
    ...a.digitalLines.map((l) => l.slug),
    ...b.digitalLines.map((l) => l.slug),
  ]);
  if (slugs.size === 0) return [];

  const budgetFor = (payload: CampaignBuilderPayload, slug: string) =>
    payload.digitalLines
      .filter((l) => l.slug === slug)
      .reduce((s, l) => s + l.budgetWon, 0);

  const rows = [...slugs].map((slug) => {
    const valueA = budgetFor(a, slug);
    const valueB = budgetFor(b, slug);
    return {
      slug,
      delta: valueB - valueA,
      absDelta: Math.abs(valueB - valueA),
    };
  });

  const total = rows.reduce((s, r) => s + r.absDelta, 0);
  if (total <= 0) {
    return buildBudgetChart(b, catalogBySlug);
  }

  return rows
    .filter((r) => r.absDelta > 0)
    .map((r) => ({
      label: catalogBySlug?.get(r.slug)?.nameKo ?? r.slug,
      value: r.absDelta,
      colorKey: r.delta >= 0 ? "digital" : "static",
      pct: Math.round((r.absDelta / total) * 1000) / 10,
    }));
}
