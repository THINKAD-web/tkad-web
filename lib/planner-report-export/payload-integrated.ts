import type { MediaItem } from "@/lib/media-data";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { computeIntegratedProInsights } from "@/lib/planner/integrated-report-insights";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  computePortfolioContributions,
  mediaItemToExportRow,
} from "@/lib/document-media-detail";
import type {
  PlannerExportSection,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

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
  months?: number;
};

export function buildIntegratedReportPayload(
  a: BuildIntegratedPayloadArgs,
): PlannerReportExportPayload {
  const isKo = a.isKo;
  const m = a.metrics;
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

  const kpis = [
    { label: isKo ? "OOH 예상 노출" : "OOH impressions", value: fmt(m.oohImpressions) },
    { label: isKo ? "디지털 예상 노출" : "Digital impressions", value: fmt(m.digitalTotalImpressions) },
    { label: isKo ? "통합 ROAS (기대)" : "Integrated ROAS", value: `${m.integratedRoasExpected}${isKo ? "배" : "×"}` },
  ];

  // ── 차트 데이터 (웹·PDF·PPTX 공용) ──
  const digitalBudgetWon = m.digitalBudgetMan * 10_000;
  const digitalCpm =
    m.digitalTotalImpressions > 0
      ? Math.round((digitalBudgetWon / m.digitalTotalImpressions) * 1000)
      : 0;
  const charts = {
    budgetSplit: [
      { label: isKo ? "OOH" : "OOH", value: Math.max(0, m.oohBudgetMan) },
      { label: isKo ? "디지털" : "Digital", value: Math.max(0, m.digitalBudgetMan) },
    ].filter((d) => d.value > 0),
    cpmBars: [
      { label: isKo ? "OOH CPM" : "OOH CPM", value: m.oohCpmKrw ?? 0 },
      { label: isKo ? "디지털 CPM" : "Digital CPM", value: digitalCpm },
    ].filter((d) => d.value > 0),
    reachSummary: [
      { label: isKo ? "OOH 노출" : "OOH", value: Math.max(0, m.oohImpressions) },
      { label: isKo ? "디지털 노출" : "Digital", value: Math.max(0, m.digitalTotalImpressions) },
    ].filter((d) => d.value > 0),
  };

  // ── 전략 인사이트 (왜 / 효과 / 다음 액션) ──
  const sections: PlannerExportSection[] = [];
  if (a.includeProSections) {
    const ins = computeIntegratedProInsights({
      portfolio: a.portfolio,
      metrics: m,
      digitalResult: a.digitalResult,
      goal: a.goal,
      isKo,
    });
    const topMedia = a.portfolio[0]?.name ?? (isKo ? "핵심 매체" : "key media");
    const topChannel =
      a.digitalResult.channels[0] &&
      (isKo
        ? a.digitalResult.channels[0].channel.nameKo
        : a.digitalResult.channels[0].channel.nameEn);

    sections.push({
      title: isKo ? "전략 요약 — 왜 이 조합인가" : "Strategy — why this mix",
      lines: [
        isKo
          ? `왜 이 조합인가 · ${ins.competitiveAdvantageKo}`
          : `Why · ${ins.competitiveAdvantageEn}`,
        isKo
          ? `핵심 로직 · ${topMedia}로 오프라인 인지를 형성하고${topChannel ? `, 같은 타깃을 ${topChannel}로 즉시 리타게팅`: ""}해 인지→전환 깔때기를 끊김 없이 연결합니다.`
          : `Logic · Build offline awareness with ${topMedia}${topChannel ? `, then retarget the same audience on ${topChannel}` : ""} to close the awareness→conversion funnel.`,
        isKo
          ? `기대 시너지 · 단일 매체 대비 도달 +${ins.crossMediaReachAmplificationPct}%, 추가 시너지 노출 약 ${fmt(ins.synergyImpressionsEstimate)}회`
          : `Synergy · +${ins.crossMediaReachAmplificationPct}% reach vs single channel, ~${fmt(ins.synergyImpressionsEstimate)} extra synergy impressions`,
      ],
    });

    sections.push({
      title: isKo ? "예상 효과" : "Expected impact",
      lines: [
        isKo
          ? `브랜드 리프트 +${ins.brandLiftPct}% · 전환 기여 ${ins.conversionContributionPct}% · 효율 등급 ${ins.efficiencyGrade}`
          : `Brand lift +${ins.brandLiftPct}% · conversion ${ins.conversionContributionPct}% · grade ${ins.efficiencyGrade}`,
        isKo
          ? `통합 효율 점수 ${ins.integratedEfficiencyScore}/100 (OOH CPM ₩${ins.oohCpm.toLocaleString()} · 디지털 CPM ₩${ins.digitalCpm.toLocaleString()})`
          : `Efficiency ${ins.integratedEfficiencyScore}/100 (OOH CPM ₩${ins.oohCpm.toLocaleString()} · Digital CPM ₩${ins.digitalCpm.toLocaleString()})`,
        isKo
          ? `통합 ROAS ${m.integratedRoasConservative}~${m.integratedRoasOptimistic}배 (보수~낙관 시나리오)`
          : `Integrated ROAS ${m.integratedRoasConservative}–${m.integratedRoasOptimistic}× (conservative–optimistic)`,
      ],
    });

    sections.push({
      title: isKo ? "다음 액션" : "Next actions",
      lines: [
        ...(isKo ? ins.budgetReallocationKo : ins.budgetReallocationEn).slice(0, 2),
        isKo ? `시즌·시간대 · ${ins.seasonStrategyKo}` : `Timing · ${ins.seasonStrategyEn}`,
        isKo ? `다음 캠페인 · ${ins.nextCampaignKo}` : `Next flight · ${ins.nextCampaignEn}`,
      ],
    });
  }

  return {
    kind: "integrated",
    isKo,
    documentTitle: isKo ? "OOH + 디지털 통합 제안서" : "OOH + Digital Integrated Proposal",
    campaignName: a.goalTitle,
    generatedAt: a.generatedAt,
    goalTitle: a.goalTitle,
    budgetMan: a.budgetMan,
    periodDisplay: a.periodDisplay,
    regionsText: a.regionsText,
    categoriesText: a.categoriesText,
    ageText: a.ageText,
    industryText: a.industryText,
    kpis,
    charts,
    portfolio: (() => {
      const months = Math.max(1, a.months ?? 1);
      const contributions = computePortfolioContributions(a.portfolio, months);
      return a.portfolio.map((mm) =>
        mediaItemToExportRow(mm, isKo, {
          months,
          contributions,
          lineTotalWon:
            mm.price > 0 ? catalogPriceFieldToWon(mm.price) * months : undefined,
        }),
      );
    })(),
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
