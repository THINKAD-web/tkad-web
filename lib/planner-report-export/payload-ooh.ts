import type { MediaItem } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
import {
  computePortfolioReportMetrics,
  impressionShareByCategory,
} from "@/lib/planner-logic";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import {
  computePortfolioContributions,
  mediaItemToExportRow,
} from "@/lib/document-media-detail";
import type {
  PlannerExportSection,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";

export type BuildOohPayloadArgs = {
  isKo: boolean;
  goalTitle: string;
  budgetMan: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
  metrics: PlannerMetrics | null;
  reachCorePct: number;
  reachExtendedPct: number;
  blendedCpmKrw: number | null;
  budgetAllocation: {
    key: string;
    label: string;
    pct: number;
    valueWon: number;
    actualWon?: number;
  }[];
  cpmBars: { key: string; label: string; value: number }[];
  effectSummaryLines: string[];
  generatedAt: string;
  months?: number;
};

export function buildOohReportPayload(
  a: BuildOohPayloadArgs,
): PlannerReportExportPayload {
  const isKo = a.isKo;
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  const portfolioMetrics = computePortfolioReportMetrics(
    a.portfolio,
    a.months ?? 1,
  );
  const usePortfolioReach =
    a.portfolio.length > 0 && portfolioMetrics.monthlyImpressions > 0;

  const kpis: PlannerReportExportPayload["kpis"] = [];
  if (a.metrics || usePortfolioReach) {
    kpis.push({
      label: isKo ? "총 예상 노출" : "Est. impressions",
      value: fmt(
        usePortfolioReach
          ? portfolioMetrics.totalImpressions
          : (a.metrics?.estimatedTotalImpressions ?? 0),
      ),
    });
  }
  if (a.metrics) {
    kpis.push({
      label: isKo ? "기대 ROI" : "Expected ROI",
      value: `${a.metrics.roiExpected}${isKo ? "배" : "×"}`,
    });
  }
  kpis.push({
    label: isKo ? "핵심 타깃 도달" : "Core reach",
    value: `${a.reachCorePct}%`,
  });
  const blendedForKpi =
    portfolioMetrics.blendedCpmKrw ?? a.blendedCpmKrw ?? null;
  if (blendedForKpi && blendedForKpi > 0) {
    kpis.push({
      label: isKo ? "블렌디드 CPM" : "Blended CPM",
      value: `₩${blendedForKpi.toLocaleString()}`,
    });
  }

  // ── 차트 데이터 (웹·PDF·PPTX 공용) ──
  const charts = {
    budgetSplit: a.budgetAllocation
      .filter((s) => s.valueWon > 0)
      .map((s) => ({
        label: s.label,
        value: s.valueWon,
        colorKey: s.key,
        pct: s.pct,
      })),
    cpmBars: a.cpmBars
      .filter((c) => c.value > 0)
      .map((c) => ({
        label: c.label,
        value: c.value,
        colorKey: c.key,
      })),
    reachSummary: usePortfolioReach
      ? [
          {
            label: isKo ? "월 노출" : "Monthly",
            value: portfolioMetrics.monthlyImpressions,
          },
          {
            label: isKo ? "총 노출" : "Total",
            value: portfolioMetrics.totalImpressions,
          },
        ].filter((d) => d.value > 0)
      : a.metrics
        ? [
            {
              label: isKo ? "월 노출" : "Monthly",
              value: a.metrics.estimatedMonthlyImpressions,
            },
            {
              label: isKo ? "총 노출" : "Total",
              value: a.metrics.estimatedTotalImpressions,
            },
          ].filter((d) => d.value > 0)
        : [],
    impressionSplit: usePortfolioReach
      ? impressionShareByCategory(a.portfolio).map((s) => ({
          label: isKo ? s.labelKo : s.labelEn,
          value: s.value,
          colorKey: s.key,
          pct: s.pct,
        }))
      : [],
  };

  // ── 전략 요약 (왜 / 효과 / 다음 액션) ──
  const sections: PlannerExportSection[] = [];
  if (a.portfolio.length && a.metrics) {
    const topMedia = a.portfolio[0]?.name ?? (isKo ? "핵심 매체" : "key media");
    sections.push({
      title: isKo ? "전략 요약" : "Strategy summary",
      lines: [
        isKo
          ? `왜 이 구성인가 · ${a.regionsText} 핵심 동선의 ${a.portfolio.length}개 매체로 ${a.goalTitle} 목표에 맞춰 노출 효율과 도달을 균형 있게 설계했습니다.`
          : `Why · ${a.portfolio.length} media across ${a.regionsText} balance reach and efficiency for the "${a.goalTitle}" objective.`,
        isKo
          ? `예상 효과 · 총 ${fmt(usePortfolioReach ? portfolioMetrics.totalImpressions : a.metrics.estimatedTotalImpressions)}회 노출, 핵심 타깃 도달 ${a.reachCorePct}% (확장 ${a.reachExtendedPct}%), 기대 ROI ${a.metrics.roiExpected}배`
          : `Impact · ${fmt(usePortfolioReach ? portfolioMetrics.totalImpressions : a.metrics.estimatedTotalImpressions)} impressions, ${a.reachCorePct}% core reach (ext. ${a.reachExtendedPct}%), ${a.metrics.roiExpected}× expected ROI`,
        isKo
          ? `다음 액션 · ${topMedia} 우선 확정 후, 동일 동선의 디지털 리타게팅을 연계하면 전환 기여를 추가로 끌어올릴 수 있습니다.`
          : `Next · Lock ${topMedia} first, then layer digital retargeting on the same routes to lift conversion contribution.`,
      ],
    });
  }
  if (a.budgetAllocation.length) {
    sections.push({
      title: isKo ? "예산 배분 (유형별)" : "Budget allocation (by type)",
      lines: a.budgetAllocation.map((s) => {
        const wonLabel =
          (s.actualWon ?? 0) > 0
            ? `₩${(s.actualWon ?? 0).toLocaleString()}`
            : isKo
              ? "단가 문의"
              : "Price on request";
        return `${s.label} — ${s.pct}% (${wonLabel})`;
      }),
    });
  }
  if (a.effectSummaryLines.length) {
    sections.push({
      title: isKo ? "효과 요약" : "Effect summary",
      lines: a.effectSummaryLines,
    });
  }

  return {
    kind: "ooh",
    isKo,
    documentTitle: isKo ? "OOH 옥외광고 플래너 보고서" : "OOH Media Plan Report",
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
      return a.portfolio.map((m) =>
        mediaItemToExportRow(m, isKo, {
          months,
          contributions,
          lineTotalWon:
            m.price > 0 ? catalogPriceFieldToWon(m.price) * months : undefined,
        }),
      );
    })(),
    sections,
    disclaimer: isKo
      ? "본 보고서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체 재고·계약 조건에 따라 달라질 수 있습니다."
      : "This report uses THINKAD internal estimates; actual delivery may vary by inventory and terms.",
  };
}
