import { campaignBuilderCopy } from "@/lib/admin-campaign-builder/copy-ko";
import { formatWon } from "@/lib/admin-campaign-builder/format";
import type {
  CampaignBuilderPayload,
  CampaignInsightsOverride,
} from "@/lib/admin-campaign-builder/schemas";
import type { BuilderReportSummary } from "@/lib/admin-campaign-builder/summary";
import type { PlannerExportKpi } from "@/lib/planner-report-export/types";

/** Stable KPI card ids for builder override matching. */
export const BUILDER_KPI_CARD_IDS = [
  "activeChannels",
  "totalBudget",
  "expectedReach",
  "avgBudget",
  "executionLines",
  "executionBudget",
  "actualReach",
  "actualClicks",
] as const;

export type BuilderKpiCardId = (typeof BUILDER_KPI_CARD_IDS)[number];

export type BuilderKpiCard = PlannerExportKpi & {
  id: BuilderKpiCardId;
};

function sumCustomActuals(payload: CampaignBuilderPayload) {
  let reach = 0;
  let clicks = 0;
  let hasReach = false;
  let hasClicks = false;

  for (const line of payload.customLines) {
    if (line.actualReach != null) {
      reach += line.actualReach;
      hasReach = true;
    }
    if (line.actualClicks != null) {
      clicks += line.actualClicks;
      hasClicks = true;
    }
  }

  return {
    reach: hasReach ? reach : null,
    clicks: hasClicks ? clicks : null,
  };
}

function buildProposalKpiCardsBase(
  payload: CampaignBuilderPayload,
  summary: BuilderReportSummary,
  isKo: boolean,
): BuilderKpiCard[] {
  const copy = campaignBuilderCopy[payload.documentType];
  const avgBudget =
    summary.digitalLineCount > 0
      ? Math.round(summary.totalBudgetWon / summary.digitalLineCount)
      : 0;

  const cards: BuilderKpiCard[] = [
    {
      id: "activeChannels",
      label: copy.kpiLabels.activeChannels,
      value: String(summary.lineCount),
      badge: "estimated",
    },
    {
      id: "totalBudget",
      label: copy.kpiLabels.totalBudget,
      value: formatWon(summary.totalBudgetWon),
      badge: "estimated",
    },
  ];

  if (summary.reachLabel) {
    cards.push({
      id: "expectedReach",
      label: copy.kpiLabels.expectedReach,
      value: summary.reachLabel,
      badge: "estimated",
    });
  }

  if (summary.digitalLineCount > 0) {
    cards.push({
      id: "avgBudget",
      label: copy.kpiLabels.avgBudget,
      value: formatWon(avgBudget),
      badge: "estimated",
    });
  }

  return cards.slice(0, 4);
}

function buildReportKpiCardsBase(
  payload: CampaignBuilderPayload,
  summary: BuilderReportSummary,
  isKo: boolean,
): BuilderKpiCard[] {
  const copy = campaignBuilderCopy.report;
  const customBudget = payload.customLines.reduce(
    (sum, line) => sum + line.budgetWon,
    0,
  );
  const actuals = sumCustomActuals(payload);
  const cards: BuilderKpiCard[] = [];

  if (summary.customLineCount > 0) {
    cards.push({
      id: "executionLines",
      label: copy.kpiLabels.executionLines,
      value: String(summary.customLineCount),
      badge: "estimated",
    });
    cards.push({
      id: "executionBudget",
      label: copy.kpiLabels.executionBudget,
      value: formatWon(customBudget),
      badge: "estimated",
    });
  }

  if (actuals.reach != null) {
    cards.push({
      id: "actualReach",
      label: copy.kpiLabels.actualReach,
      value: actuals.reach.toLocaleString(isKo ? "ko-KR" : "en-US"),
      badge: "estimated",
    });
  }

  if (actuals.clicks != null) {
    cards.push({
      id: "actualClicks",
      label: copy.kpiLabels.actualClicks,
      value: actuals.clicks.toLocaleString(isKo ? "ko-KR" : "en-US"),
      badge: "estimated",
    });
  }

  if (cards.length > 0) {
    return cards.slice(0, 4);
  }

  return buildProposalKpiCardsBase(payload, summary, isKo);
}

/** Base KPI cards (before label/hidden overrides). */
export function buildBuilderKpiCardsBase(
  payload: CampaignBuilderPayload,
  summary: BuilderReportSummary,
  isKo: boolean,
): BuilderKpiCard[] {
  if (payload.documentType === "report") {
    return buildReportKpiCardsBase(payload, summary, isKo);
  }
  return buildProposalKpiCardsBase(payload, summary, isKo);
}

export function applyKpiCardOverrides(
  cards: BuilderKpiCard[],
  override?: CampaignInsightsOverride,
): PlannerExportKpi[] {
  const byId = new Map(
    (override?.kpiCards ?? []).map((entry) => [entry.id, entry]),
  );

  return cards
    .filter((card) => !byId.get(card.id)?.hidden)
    .map((card) => {
      const patch = byId.get(card.id);
      const labelOverride = patch?.labelOverride?.trim();
      const { id: _id, ...kpi } = card;
      return {
        ...kpi,
        label: labelOverride || card.label,
      };
    });
}

export function buildBuilderKpiCards(
  payload: CampaignBuilderPayload,
  summary: BuilderReportSummary,
  isKo: boolean,
): PlannerExportKpi[] {
  const base = buildBuilderKpiCardsBase(payload, summary, isKo);
  return applyKpiCardOverrides(base, payload.insightsOverride);
}

export type BuilderKpiCardUiRow = BuilderKpiCard & {
  defaultLabel: string;
  labelOverride?: string;
  hidden: boolean;
};

/** UI: all base cards with override state (includes hidden for re-enable). */
export function listBuilderKpiCardsForUi(
  payload: CampaignBuilderPayload,
  summary: BuilderReportSummary,
  isKo: boolean,
): BuilderKpiCardUiRow[] {
  const byId = new Map(
    (payload.insightsOverride?.kpiCards ?? []).map((entry) => [entry.id, entry]),
  );

  return buildBuilderKpiCardsBase(payload, summary, isKo).map((card) => {
    const patch = byId.get(card.id);
    const labelOverride = patch?.labelOverride?.trim();
    return {
      ...card,
      defaultLabel: card.label,
      labelOverride: labelOverride || undefined,
      hidden: patch?.hidden ?? false,
    };
  });
}
