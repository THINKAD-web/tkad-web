import type { MediaItem } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
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
  blendedCpmKrw: number | null;
  budgetAllocation: { label: string; pct: number; valueWon: number }[];
  effectSummaryLines: string[];
  generatedAt: string;
};

export function buildOohReportPayload(
  a: BuildOohPayloadArgs,
): PlannerReportExportPayload {
  const isKo = a.isKo;
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

  const kpis: PlannerReportExportPayload["kpis"] = [];
  if (a.metrics) {
    kpis.push({
      label: isKo ? "총 예상 노출" : "Est. impressions",
      value: fmt(a.metrics.estimatedTotalImpressions),
    });
    kpis.push({
      label: isKo ? "기대 ROI" : "Expected ROI",
      value: `${a.metrics.roiExpected}${isKo ? "배" : "×"}`,
    });
  }
  kpis.push({
    label: isKo ? "핵심 타깃 도달" : "Core reach",
    value: `${a.reachCorePct}%`,
  });
  if (a.blendedCpmKrw && a.blendedCpmKrw > 0) {
    kpis.push({
      label: isKo ? "블렌디드 CPM" : "Blended CPM",
      value: `₩${a.blendedCpmKrw.toLocaleString()}`,
    });
  }

  const sections: PlannerExportSection[] = [];
  if (a.budgetAllocation.length) {
    sections.push({
      title: isKo ? "예산 배분 (유형별)" : "Budget allocation (by type)",
      lines: a.budgetAllocation.map(
        (s) => `${s.label} — ${s.pct}% (₩${s.valueWon.toLocaleString()})`,
      ),
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
    sections,
    disclaimer: isKo
      ? "본 보고서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체 재고·계약 조건에 따라 달라질 수 있습니다."
      : "This report uses THINKAD internal estimates; actual delivery may vary by inventory and terms.",
  };
}
