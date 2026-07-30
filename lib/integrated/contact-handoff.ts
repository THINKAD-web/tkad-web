import type { MediaItem } from "@/lib/media-data";
import type { IntegratedMixResponse } from "@/lib/integrated/schemas";
import type { PlanTransferData } from "@/lib/planner-contact-transfer";
import type { PlannerCampaignGoal } from "@/lib/planner/types";
import { extractMixKpiView } from "@/lib/integrated/map-mix-to-ui";

function formatWon(amount: number, isKo: boolean): string {
  return isKo
    ? `₩${amount.toLocaleString("ko-KR")}`
    : `₩${amount.toLocaleString("en-US")}`;
}

function formatImpressionRange(
  min: number | null,
  max: number | null,
  isKo: boolean,
): string | null {
  if (min == null && max == null) return null;
  const lo = min ?? max!;
  const hi = max ?? min!;
  if (lo === hi) {
    return isKo
      ? `${lo.toLocaleString("ko-KR")}회`
      : `${lo.toLocaleString("en-US")}`;
  }
  return isKo
    ? `${lo.toLocaleString("ko-KR")}~${hi.toLocaleString("ko-KR")}회`
    : `${lo.toLocaleString("en-US")}–${hi.toLocaleString("en-US")}`;
}

export function buildIntegratedMixSummaryLines(opts: {
  mix: IntegratedMixResponse;
  isKo: boolean;
}): string[] {
  const { mix, isKo } = opts;
  const kpis = extractMixKpiView(mix);
  const { allocation, digital } = mix;

  const channelLines = digital.mix.channels.map((ch) => {
    const name = isKo ? ch.media.nameKo : ch.media.nameEn;
    return isKo
      ? `  · ${name}: ${formatWon(ch.budgetWon)} (${ch.budgetPct}%)`
      : `  · ${name}: ${formatWon(ch.budgetWon)} (${ch.budgetPct}%)`;
  });

  const combinedRange = formatImpressionRange(
    kpis.combinedImpressionsMin,
    kpis.combinedImpressionsMax,
    isKo,
  );
  const monthlyRange = formatImpressionRange(
    kpis.digitalMonthlyImpressionsMin,
    kpis.digitalMonthlyImpressionsMax,
    isKo,
  );

  if (isKo) {
    return [
      "[통합 미디어믹스 요약 (BFF)]",
      `- OOH ${allocation.oohBudgetPct}% / 디지털 ${allocation.digitalBudgetPct}%`,
      `- OOH 예산: ${formatWon(allocation.oohBudgetWon)}`,
      `- 디지털 예산: ${formatWon(allocation.digitalBudgetWon)}`,
      "- 디지털 채널별 예산:",
      ...channelLines,
      `- OOH 집행 기간 총 노출 (추정): ${kpis.oohCampaignImpressions.toLocaleString("ko-KR")}회`,
      monthlyRange
        ? `- 디지털 월간 노출 (추정): ${monthlyRange}`
        : null,
      combinedRange
        ? `- 통합 총 노출 (추정, 시너지 포함): ${combinedRange}`
        : null,
    ].filter((line): line is string => Boolean(line));
  }

  return [
    "[Integrated media mix summary (BFF)]",
    `- OOH ${allocation.oohBudgetPct}% / digital ${allocation.digitalBudgetPct}%`,
    `- OOH budget: ${formatWon(allocation.oohBudgetWon)}`,
    `- Digital budget: ${formatWon(allocation.digitalBudgetWon)}`,
    "- Digital channel budgets:",
    ...channelLines,
    `- OOH campaign-period impressions (est.): ${kpis.oohCampaignImpressions.toLocaleString("en-US")}`,
    monthlyRange ? `- Digital monthly impressions (est.): ${monthlyRange}` : null,
    combinedRange
      ? `- Combined total impressions (est., incl. synergy): ${combinedRange}`
      : null,
  ].filter((line): line is string => Boolean(line));
}

export function buildIntegratedMixPlanTransfer(opts: {
  mix: IntegratedMixResponse;
  portfolio: MediaItem[];
  campaignGoal: PlannerCampaignGoal | null;
  regions: string[];
  months: number;
  budgetTotalWon: number;
  isKo: boolean;
}): PlanTransferData {
  const { mix, portfolio, regions, months, budgetTotalWon, isKo } = opts;
  const kpis = extractMixKpiView(mix);

  return {
    mediaIds: portfolio.map((m) => m.id),
    mediaNames: portfolio.map((m) => (isKo ? m.name : m.nameEn || m.name)),
    totalBudget: budgetTotalWon,
    duration: Math.max(1, Math.round(months)),
    region: regions.join(", ") || undefined,
    goal: opts.campaignGoal ?? undefined,
    estimatedReach: kpis.combinedImpressionsMax ?? kpis.oohCampaignImpressions,
    source: "integrated",
    mixSummaryLines: buildIntegratedMixSummaryLines({ mix, isKo }),
  };
}
