import type { MediaItem } from "@/lib/media-data";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { computeIntegratedProInsights } from "@/lib/planner/integrated-report-insights";
import type {
  PlannerExportSection,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

function priceLabel(m: MediaItem, isKo: boolean): string {
  if (!m.price || m.price <= 0) return isKo ? "문의" : "Inquire";
  return isKo
    ? `${m.price.toLocaleString("ko-KR")}원`
    : `${m.price.toLocaleString("en-US")} KRW`;
}

export type BuildIntegratedPayloadArgs = {
  isKo: boolean;
  goal: PlannerCampaignGoal | null;
  goalTitle: string;
  budgetMan: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
  digitalResult: DigitalRecommendResult;
  metrics: IntegratedCampaignMetrics;
  generatedAt: string;
  includeProSections: boolean;
};

export function buildIntegratedReportPayload(
  a: BuildIntegratedPayloadArgs,
): PlannerReportExportPayload {
  const isKo = a.isKo;
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

  const kpis = [
    { label: isKo ? "OOH 예상 노출" : "OOH impressions", value: fmt(a.metrics.oohImpressions) },
    { label: isKo ? "디지털 예상 노출" : "Digital impressions", value: fmt(a.metrics.digitalTotalImpressions) },
    { label: isKo ? "통합 ROAS (기대)" : "Integrated ROAS", value: `${a.metrics.integratedRoasExpected}${isKo ? "배" : "×"}` },
  ];

  const sections: PlannerExportSection[] = [];
  if (a.includeProSections) {
    const ins = computeIntegratedProInsights({
      portfolio: a.portfolio,
      metrics: a.metrics,
      digitalResult: a.digitalResult,
      goal: a.goal,
      isKo,
    });
    sections.push({
      title: isKo ? "OOH × 디지털 시너지" : "OOH × digital synergy",
      lines: [
        isKo
          ? `크로스미디어 도달 증폭 +${ins.crossMediaReachAmplificationPct}% · 시너지 노출 ${fmt(ins.synergyImpressionsEstimate)}`
          : `Reach amplification +${ins.crossMediaReachAmplificationPct}% · synergy impressions ${fmt(ins.synergyImpressionsEstimate)}`,
        ...ins.mediaSynergyStrategies.map((s) => (isKo ? s.strategyKo : s.strategyEn)),
      ],
    });
    sections.push({
      title: isKo ? "통합 CPM · 효율" : "Blended CPM & efficiency",
      lines: [
        `OOH CPM ₩${ins.oohCpm.toLocaleString()} · ${isKo ? "디지털" : "Digital"} CPM ₩${ins.digitalCpm.toLocaleString()}`,
        isKo ? `통합 효율 점수 ${ins.integratedEfficiencyScore}/100` : `Efficiency score ${ins.integratedEfficiencyScore}/100`,
        isKo ? ins.competitiveAdvantageKo : ins.competitiveAdvantageEn,
      ],
    });
    sections.push({
      title: isKo ? "ROI 예측" : "ROI forecast",
      lines: [
        isKo
          ? `브랜드 리프트 +${ins.brandLiftPct}% · 전환 기여 ${ins.conversionContributionPct}% · 효율 등급 ${ins.efficiencyGrade}`
          : `Brand lift +${ins.brandLiftPct}% · conversion ${ins.conversionContributionPct}% · grade ${ins.efficiencyGrade}`,
        isKo
          ? `통합 ROAS ${a.metrics.integratedRoasConservative}~${a.metrics.integratedRoasOptimistic}배 (보수~낙관)`
          : `Integrated ROAS ${a.metrics.integratedRoasConservative}–${a.metrics.integratedRoasOptimistic}×`,
      ],
    });
    sections.push({
      title: isKo ? "AI 최적화 제안" : "AI optimization",
      lines: [
        ...(isKo ? ins.budgetReallocationKo : ins.budgetReallocationEn),
        isKo ? ins.seasonStrategyKo : ins.seasonStrategyEn,
        isKo ? ins.nextCampaignKo : ins.nextCampaignEn,
      ],
    });
  }

  return {
    kind: "integrated",
    isKo,
    documentTitle: isKo ? "OOH + 디지털 통합 제안서" : "OOH + Digital Integrated Proposal",
    generatedAt: a.generatedAt,
    goalTitle: a.goalTitle,
    budgetMan: a.budgetMan,
    periodDisplay: a.periodDisplay,
    regionsText: a.regionsText,
    categoriesText: a.categoriesText,
    ageText: a.ageText,
    industryText: a.industryText,
    kpis,
    portfolio: a.portfolio.map((m) => ({
      name: m.name,
      region: m.region ?? "—",
      type: m.type ?? "—",
      priceLabel: priceLabel(m, isKo),
    })),
    digital: a.digitalResult.channels.map((c) => ({
      platform: isKo ? c.channel.nameKo : c.channel.nameEn,
      sharePct: c.budgetPct,
      impressions: c.estimatedImpressions,
    })),
    digitalSummary: isKo
      ? `총 디지털 예산: OOH 대비 ${a.digitalResult.digitalBudgetPct}% (${a.digitalResult.totalDigitalBudgetMan.toLocaleString()}만원)`
      : `Suggested digital share: ${a.digitalResult.digitalBudgetPct}% of total (${a.digitalResult.totalDigitalBudgetMan.toLocaleString()}M KRW)`,
    sections,
    disclaimer: isKo
      ? "본 제안서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체·플랫폼 재고에 따라 달라질 수 있습니다."
      : "This proposal uses THINKAD internal estimates; actual delivery may vary by inventory.",
  };
}
