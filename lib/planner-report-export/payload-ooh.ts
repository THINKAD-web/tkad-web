import type { MediaItem } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
import { calculatePlan } from "@/lib/planner/calc/engine";
import {
  plannerMediaPeriodLineWon,
  resolvePlanPeriodInput,
} from "@/lib/planner/planner-media-quantity";
import { reportPlanValidation } from "@/lib/planner/calc/report-validation";
import {
  computePortfolioContributions,
  mediaItemToExportRow,
} from "@/lib/document-media-detail";
import {
  formatReportJpyExchangeFootnote,
  portfolioHasJapanMedia,
} from "@/lib/media-display-currency";
import type {
  PlannerExportChartDatum,
  PlannerExportRegionBreakdown,
  PlannerExportSection,
  PlannerExportCharts,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { buildPerformanceChartGuide, PLANNER_TOTAL_REACH_LABEL } from "@/lib/planner-report-performance-guide";
import { buildPartialRateNotice } from "@/lib/planner/partial-rate-notice";
import { buildQuoteOnlyNotice } from "@/lib/planner/quote-only-portfolio";
import {
  buildCpmExclusionFootnote,
  categoryCpmBarsExcludingQuoteOnly,
} from "@/lib/planner/quote-only-portfolio";
import { buildReportBudgetHonesty } from "@/lib/planner/report-budget-honesty";
import { portfolioQuoteOnlyMedia } from "@/lib/media-pricing-mode";
import { plannerReportPricingFootnote } from "@/lib/planner-report-export/pricing-footnote";
import { buildPlannerQuoteSummary } from "@/lib/planner-report-export/build-quote-summary";
import { buildPlannerRecommendRationale } from "@/lib/planner/report-recommend-rationale";
import { regionalBreakdownSectionLines } from "@/lib/plan-cart-report/regional-breakdown";
import { computeRegionSubdivisionReport } from "@/lib/plan-cart-report/region-subdivision";
import {
  groupPlanCartReportPortfolio,
  reportPortfolioOrderOpts,
  resolveReportPortfolioOrder,
} from "@/lib/plan-cart-report/sort-portfolio";
import {
  buildReportStrategyLines,
  buildReportWhyLine,
} from "@/lib/planner/report-strategy";
import type { PlannerIndustryKey } from "@/lib/planner/types";
import type { PlannerPortfolioPricing } from "@/lib/planner/planner-media-quantity";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import { buildGoalFollowUpReportLines } from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type { ExportKpiBadgeKey } from "@/lib/planner-report-export/export-badge";
import {
  exportKpiPending,
  exportKpiValue,
} from "@/lib/planner-report-export/export-kpi";
import type { PlannerExportBadgeKind } from "@/lib/planner-report-export/export-badge";

export type BuildOohPayloadArgs = {
  isKo: boolean;
  goalTitle: string;
  budgetMan: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  industryKey?: PlannerIndustryKey | null;
  campaignGoal?: PlannerCampaignGoal | null;
  seoulZones?: readonly PlannerSeoulZoneKey[];
  goalFollowUp?: PlannerGoalFollowUp;
  portfolio: MediaItem[];
  metrics: PlannerMetrics | null;
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
  /**
   * 캠페인 실제 집행일 (A-1b Wave 2) — 있으면 CalcEngine 이 월 환산을
   * 거치지 않고 이 날짜로 직접 일수를 계산한다(`PlanPeriodInput` 의
   * `flight` 종류). 둘 다 있어야 쓰인다 — 하나만 있으면 `months` 로 폴백.
   */
  flightStart?: string | null;
  flightEnd?: string | null;
  regionBreakdown?: PlannerExportRegionBreakdown[];
  regionBudgetCharts?: PlannerExportChartDatum[];
  regionImpressionCharts?: PlannerExportChartDatum[];
  isAutoPortfolio?: boolean;
  campaignMediaQuantities?: Record<string, number>;
  campaignMediaPriceOptionIndex?: Record<string, number>;
  /**
   * 매체별 캠페인 기간 노출 (A-1b Wave 3) — 저장 스냅샷을 정본으로 표시할 때.
   * 주어지면 엔진이 유동인구에서 유도하지 않고 이 값을 집계만 하므로,
   * 화면·PDF 에 뜨는 숫자가 저장 시점 값과 정의상 일치한다.
   */
  campaignMediaImpressions?: Record<string, number>;
  /** 내 플랜 보고서 — 복수 옵션 라벨·금액 */
  planCartItems?: import("@/lib/plan-cart").PlanCartItem[];
  /** 4번 확장 — 명시적 portfolio mediaId 순서 (cartItems보다 우선) */
  manualPortfolioOrder?: readonly string[];
  /** R-3: channelMode=ooh_digital 이지만 digital 스냅샷 없을 때 */
  digitalOmittedNotice?: string;
  /** A-1b Wave 3 — 저장 스냅샷이 이전 엔진 버전일 때 */
  staleEngineNotice?: string;
  /** PR-8-2 — KPI별 배지 (미지정 시 impressions/cpm=estimated, reach/roi=pending) */
  kpiBadges?: Partial<Record<ExportKpiBadgeKey, PlannerExportBadgeKind>>;
  mixSource?: "inquiry_match";
  budgetHonesty?: import("@/lib/planner/brief/over-budget-copy").PlannerExportBudgetHonesty;
  /** 표지·헤더용 광고주명 (선택) */
  clientName?: string;
  /** 표지 로고 — planner creative upload URL */
  coverLogoUrl?: string | null;
  /** C-full-1 — 인사말·요약 (undefined = 레거시 자동 sections) */
  reportGreeting?: string;
  reportExecutiveSummaryLines?: string[];
  /** C-full-3a — 캠페인 총 제작비 (직접 입력) */
  productionCostWon?: number | null;
  /** 부록 표 제목 (없으면 지정 매체 스펙 기본값) */
  appendixSectionTitle?: string;
  appendixMediaSpecs?: import("@/lib/planner-report-export/types").PlannerExportAppendixMediaSpec[];
  /** 카탈로그 외 커스텀 mix — portfolio 카드 뒤에 append */
  customPortfolioRows?: import("@/lib/planner-report-export/types").PlannerExportMediaRow[];
  customLineCount?: number;
};

export function buildOohReportPayload(
  a: BuildOohPayloadArgs,
): PlannerReportExportPayload {
  const isKo = a.isKo;
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");
  const pricing: PlannerPortfolioPricing = {
    quantities: a.campaignMediaQuantities,
    priceOptionIndex: a.campaignMediaPriceOptionIndex,
    impressions: a.campaignMediaImpressions,
    flight:
      a.flightStart && a.flightEnd
        ? { startDate: a.flightStart, endDate: a.flightEnd }
        : undefined,
  };
  const campaignMonths = a.months ?? 1;
  const periodCtx =
    campaignMonths > 0 ? { months: campaignMonths } : undefined;
  /**
   * A-1 Wave 4 — 보고서 payload 의 모든 지표가 여기서 나온다.
   * 예전에는 총노출·CPM·유형별 비중·탐색 카테고리 비중을 각각 다른 함수로
   * 재계산해, 같은 보고서 안에서 값이 어긋날 수 있었다.
   */
  const plan = calculatePlan({
    media: a.portfolio.map((m) => ({
      media: m,
      units: pricing.quantities?.[m.id],
      itemNet: plannerMediaPeriodLineWon(
        m,
        periodCtx ?? { months: 1 },
        pricing,
        isKo,
      ),
      itemImpressions: a.campaignMediaImpressions?.[m.id],
    })),
    period: resolvePlanPeriodInput(campaignMonths, pricing),
    budgetWon: Math.max(0, a.budgetMan) * 10_000,
    goal: a.campaignGoal ?? null,
    industryKey: a.industryKey ?? null,
    locale: isKo ? "ko" : "en",
  });

  // 엔진이 스스로의 약속을 지켰는지 확인한다. 실패해도 던지지 않는다.
  reportPlanValidation(plan, "report_payload_ooh");

  /**
   * 표시 금액(선형 환산)과 실제 청구 기준이 갈릴 수 있는 매체 안내.
   * 표시값 자체는 바꾸지 않는다 — 문서 전체가 선형 환산 기준으로 통일돼 있다.
   */
  const partialRateNotice = buildPartialRateNotice({
    portfolio: a.portfolio,
    days: plan.period.days,
    displayedLineWonById: Object.fromEntries(
      a.portfolio.map((m) => [
        m.id,
        plannerMediaPeriodLineWon(m, periodCtx ?? { months: 1 }, pricing, isKo),
      ]),
    ),
    unitsById: pricing.quantities,
    isKo,
  });

  const quoteOnlyNotice = buildQuoteOnlyNotice({
    portfolio: a.portfolio,
    isKo,
  });
  const hasQuoteOnly = portfolioQuoteOnlyMedia(a.portfolio).length > 0;
  const cpmExcludesQuoteOnly = hasQuoteOnly;
  const cpmFootnote = buildCpmExclusionFootnote({
    plan,
    portfolio: a.portfolio,
    isKo,
  });
  const cpmBarRows = categoryCpmBarsExcludingQuoteOnly(
    plan,
    a.portfolio,
    isKo,
  );

  const portfolioMetrics = {
    monthlyImpressions: plan.impressions.monthlyEquivalent,
    totalImpressions: plan.impressions.campaignTotal,
    blendedCpmKrw: a.blendedCpmKrw ?? plan.cpm.campaignWon,
  };
  const usePortfolioReach =
    a.portfolio.length > 0 && portfolioMetrics.monthlyImpressions > 0;

  const badge = (key: ExportKpiBadgeKey): PlannerExportBadgeKind => {
    if (key === "reach" || key === "roi") return "pending";
    return a.kpiBadges?.[key] ?? "estimated";
  };

  const kpis: PlannerReportExportPayload["kpis"] = [];
  if (a.metrics || usePortfolioReach) {
    kpis.push(
      exportKpiValue(
        isKo ? "총 예상 노출" : "Est. impressions",
        fmt(
          usePortfolioReach
            ? portfolioMetrics.totalImpressions
            : (a.metrics?.estimatedTotalImpressions ?? 0),
        ),
        badge("impressions"),
      ),
    );
  }
  kpis.push(
    exportKpiPending(isKo ? "핵심 타깃 도달" : "Core reach", isKo),
  );
  kpis.push(exportKpiPending(isKo ? "기대 ROI" : "Expected ROI", isKo));
  const blendedForKpi =
    portfolioMetrics.blendedCpmKrw ?? a.blendedCpmKrw ?? null;
  if (blendedForKpi && blendedForKpi > 0) {
    kpis.push(
      exportKpiValue(
        cpmExcludesQuoteOnly
          ? isKo
            ? "블렌디드 CPM (문의 매체 제외)"
            : "Blended CPM (excl. inquiry)"
          : isKo
            ? "블렌디드 CPM"
            : "Blended CPM",
        `₩${blendedForKpi.toLocaleString()}`,
        badge("cpm"),
      ),
    );
  }

  // ── 차트 데이터 (웹·PDF·PPTX 공용) ──
  const browseBudgetSlices = plan.breakdown.byBrowseCategory;
  const charts: PlannerExportCharts = {
    budgetSplit: a.budgetAllocation
      .filter((s) => s.valueWon > 0)
      .map((s) => ({
        label: s.label,
        value: s.valueWon,
        colorKey: s.key,
        pct: s.pct,
      })),
    browseBudgetSplit: browseBudgetSlices
      .filter((s) => s.budgetAmount > 0)
      .map((s) => ({
        label: isKo ? s.labelKo : s.labelEn,
        value: s.budgetAmount,
        colorKey: s.key,
        pct: s.budgetShare,
      })),
    cpmBars: cpmBarRows.map((c) => ({
        label: c.label,
        value: c.value,
        colorKey: c.key,
      })),
    reachSummary: usePortfolioReach
      ? [
          {
            label: isKo ? "월 실노출(추정)" : "Monthly reach (est.)",
            value: portfolioMetrics.monthlyImpressions,
          },
          {
            label: isKo ? PLANNER_TOTAL_REACH_LABEL.ko : PLANNER_TOTAL_REACH_LABEL.en,
            value: portfolioMetrics.totalImpressions,
          },
        ].filter((d) => d.value > 0)
      : a.metrics
        ? [
            {
              label: isKo ? "월 실노출(추정)" : "Monthly reach (est.)",
              value: a.metrics.estimatedMonthlyImpressions,
            },
            {
              label: isKo ? PLANNER_TOTAL_REACH_LABEL.ko : PLANNER_TOTAL_REACH_LABEL.en,
              value: a.metrics.estimatedTotalImpressions,
            },
          ].filter((d) => d.value > 0)
        : [],
    impressionSplit: usePortfolioReach
      ? plan.breakdown.byCategory
          .filter((s) => s.monthlyImpressions > 0)
          .map((s) => ({
            label: isKo ? s.labelKo : s.labelEn,
            value: s.monthlyImpressions,
            colorKey: s.key,
            pct: s.impressionShare,
          }))
      : [],
    browseImpressionSplit: usePortfolioReach
      ? plan.breakdown.byBrowseCategory
          .filter((s) => s.monthlyImpressions > 0)
          .map((s) => ({
            label: isKo ? s.labelKo : s.labelEn,
            value: s.monthlyImpressions,
            colorKey: s.key,
            pct: s.impressionShare,
          }))
      : [],
    regionBudgetSplit: a.regionBudgetCharts,
    regionImpressionSplit: a.regionImpressionCharts,
  };

  const performanceGuide = buildPerformanceChartGuide(
    isKo,
    (charts.budgetSplit ?? []).map((s) => ({ label: s.label, pct: s.pct ?? 0 })),
    (charts.impressionSplit ?? []).map((s) => ({
      label: s.label,
      pct: s.pct ?? 0,
    })),
    (charts.cpmBars ?? []).map((c) => ({ label: c.label, value: c.value })),
  );
  if (performanceGuide) {
    charts.performanceGuide = performanceGuide;
  }

  // ── 전략 요약 (왜 / 효과 / 다음 액션) ──
  const sections: PlannerExportSection[] = [];

  const goalContextLines = buildGoalFollowUpReportLines(
    a.campaignGoal ?? null,
    a.goalFollowUp ?? {},
    isKo,
  );
  if (goalContextLines.length > 0) {
    sections.push({
      title: isKo ? "캠페인 목표 맥락" : "Campaign goal context",
      lines: goalContextLines,
    });
  }

  if (a.portfolio.length) {
    const topMedia = a.portfolio[0]?.name ?? (isKo ? "핵심 매체" : "key media");
    const strategyCtx = {
      isKo,
      campaignGoal: a.campaignGoal ?? null,
      goalTitle: a.goalTitle,
      industryKey: a.industryKey ?? null,
      industryText: a.industryText,
      regionsText: a.regionsText,
      seoulZones: a.seoulZones ?? [],
      followUp: a.goalFollowUp ?? {},
      portfolioCount: a.portfolio.length,
    };
    const hasExecutiveOverride = a.reportExecutiveSummaryLines !== undefined;
    if (!hasExecutiveOverride) {
      const extraLines = buildReportStrategyLines(strategyCtx);
      const impressionTotal =
        a.metrics || usePortfolioReach
          ? fmt(
              usePortfolioReach
                ? portfolioMetrics.totalImpressions
                : (a.metrics?.estimatedTotalImpressions ?? 0),
            )
          : null;
      const strategyLines = [
        buildReportWhyLine(strategyCtx),
        ...extraLines,
        impressionTotal
          ? isKo
            ? `예상 효과 · 총 ${impressionTotal}회 노출(추정). 핵심 타깃 도달률·ROI는 행정동 인구 데이터 연동 후 제공됩니다.`
            : `Impact · ${impressionTotal} estimated impressions. Core reach and ROI will be available after dong-level population data is connected.`
          : isKo
            ? "예상 효과 · 핵심 타깃 도달률·ROI는 행정동 인구 데이터 연동 후 제공됩니다."
            : "Impact · Core reach and ROI will be available after dong-level population data is connected.",
        isKo
          ? `다음 액션 · ${topMedia} 우선 확정 후, 동일 동선의 디지털 리타게팅을 연계하면 전환 기여를 추가로 끌어올릴 수 있습니다.`
          : `Next · Lock ${topMedia} first, then layer digital retargeting on the same routes to lift conversion contribution.`,
      ];
      sections.push({
        title: isKo ? "전략 요약" : "Strategy summary",
        lines: strategyLines,
      });
    }
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
  if (a.digitalOmittedNotice) {
    sections.push({
      title: isKo ? "디지털 채널" : "Digital channels",
      lines: [a.digitalOmittedNotice],
    });
  }
  if (a.staleEngineNotice) {
    sections.push({
      title: isKo ? "계산 기준" : "Calculation basis",
      lines: [a.staleEngineNotice],
    });
  }
  if (a.regionBreakdown && a.regionBreakdown.length > 1) {
    sections.push({
      title: isKo ? "지역별 예산·효과" : "Budget & impact by region",
      lines: regionalBreakdownSectionLines(a.regionBreakdown, isKo),
    });
  }

  const months = campaignMonths;
  const orderOpts = reportPortfolioOrderOpts({
    planCartItems: a.planCartItems,
    manualPortfolioOrder: a.manualPortfolioOrder,
  });
  const orderedPortfolio = resolveReportPortfolioOrder(a.portfolio, orderOpts);
  const contributions = computePortfolioContributions(
    orderedPortfolio,
    months,
    pricing,
    periodCtx,
  );
  /**
   * 증상3 — 카드 병기용 SOV 보정 일 실노출. 새 계산이 아니라 이미 위에서
   * `calculatePlan` 이 낸 `plan.mediaItems[].dailyImpressions` 를 id 로만
   * 옮긴다. 별도로 다시 계산하면 Wave 3 가 겪은 다중 배선 문제가 재발한다.
   */
  const adjustedDailyReachById = Object.fromEntries(
    plan.mediaItems.map((mi) => [mi.id, Math.round(mi.dailyImpressions)]),
  );
  const portfolioRows = [
    ...orderedPortfolio.map((m) =>
      mediaItemToExportRow(m, isKo, {
        months,
        periodCtx,
        contributions,
        pricing,
        planCartItem: a.planCartItems?.find((item) => item.mediaId === m.id),
        adjustedDailyReachById,
      }),
    ),
    ...(a.customPortfolioRows ?? []),
  ];

  const recommendRationale = buildPlannerRecommendRationale({
    portfolio: orderedPortfolio,
    portfolioRows,
    budgetMan: a.budgetMan,
    months,
    isKo,
    // 이미 pricing·periodCtx 로 계산한 값을 넘긴다 — 본문과 KPI 가 같은 CPM 을 쓴다.
    blendedCpmKrw: portfolioMetrics.blendedCpmKrw,
    totalImpressions: portfolioMetrics.totalImpressions,
    monthlyImpressions: portfolioMetrics.monthlyImpressions,
    pricing,
    isAutoPortfolio: a.isAutoPortfolio,
    isInquiryMatched: a.mixSource === "inquiry_match",
  });

  const subdivisionReport = computeRegionSubdivisionReport(
    orderedPortfolio,
    months,
    isKo,
    pricing,
  );
  if (subdivisionReport) {
    charts.regionSubdivisionBudgetSplit =
      subdivisionReport.budgetCharts.length > 1
        ? subdivisionReport.budgetCharts
        : undefined;
    charts.regionSubdivisionImpressionSplit =
      subdivisionReport.impressionCharts.length > 1
        ? subdivisionReport.impressionCharts
        : undefined;
  }

  const portfolioGroups = (() => {
    if (!a.regionBreakdown?.length) return undefined;
    const rowByKey = new Map<string, (typeof portfolioRows)[number]>();
    orderedPortfolio.forEach((m, i) => {
      rowByKey.set(m.id, portfolioRows[i]!);
    });
    const grouped = groupPlanCartReportPortfolio(a.portfolio, isKo, orderOpts);
    return grouped.map((group) => ({
      regionLabel: group.regionLabel,
      categories: group.categories.map((cat) => ({
        categoryLabel: cat.categoryLabel,
        items: cat.items.map((m) => rowByKey.get(m.id)!).filter(Boolean),
      })),
    }));
  })();

  const confirmedFromAllocation = a.budgetAllocation.reduce(
    (sum, s) => sum + (s.actualWon ?? s.valueWon),
    0,
  );
  const budgetHonesty =
    a.budgetHonesty ??
    buildReportBudgetHonesty({
      requestWon: Math.max(0, a.budgetMan) * 10_000,
      portfolio: a.portfolio,
      pricing,
      periodCtx: periodCtx ?? { months: 1 },
      isKo,
      confirmedMixWon:
        confirmedFromAllocation > 0 ? confirmedFromAllocation : undefined,
      planMetrics: plan.metrics,
    });

  const quoteSummary = buildPlannerQuoteSummary({
    mixWon: budgetHonesty.mixWon,
    productionCostWon: a.productionCostWon,
    quoteOnlyNotice: quoteOnlyNotice
      ? {
          count: quoteOnlyNotice.count,
          groupLabel: quoteOnlyNotice.groupLabel,
        }
      : undefined,
    customLineCount: a.customLineCount,
    isKo,
  });

  return {
    kind: "ooh",
    isKo,
    documentTitle:
      a.regionBreakdown && a.regionBreakdown.length > 0
        ? isKo
          ? "내 플랜 매체 제안 보고서"
          : "My plan media report"
        : isKo
          ? "OOH 옥외광고 플래너 보고서"
          : "OOH Media Plan Report",
    campaignName: a.goalTitle,
    clientName: a.clientName?.trim() || undefined,
    coverLogoUrl: a.coverLogoUrl?.trim() || undefined,
    greetingText: a.reportGreeting?.trim() || undefined,
    executiveSummaryLines:
      a.reportExecutiveSummaryLines && a.reportExecutiveSummaryLines.length > 0
        ? a.reportExecutiveSummaryLines
        : undefined,
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
    regionBreakdown: a.regionBreakdown,
    regionSubdivision: subdivisionReport
      ? {
          sourceField: subdivisionReport.sourceField,
          sourceFieldLabel: subdivisionReport.sourceFieldLabel,
          classifiedCount: subdivisionReport.classifiedCount,
          totalCount: subdivisionReport.totalCount,
          coverageNote: subdivisionReport.coverageNote,
          breakdown: subdivisionReport.breakdown,
        }
      : undefined,
    portfolio: portfolioRows,
    portfolioGroups,
    recommendRationale,
    mixSource: a.mixSource,
    budgetHonesty,
    sections,
    digitalOmittedNotice: a.digitalOmittedNotice,
    staleEngineNotice: a.staleEngineNotice,
    partialRateNotice: partialRateNotice?.text,
    quoteOnlyNotice: quoteOnlyNotice?.text,
    unpricedMediaNotice: quoteOnlyNotice?.text,
    cpmExcludesQuoteOnly: cpmExcludesQuoteOnly || undefined,
    cpmFootnote,
    currencyFootnote: portfolioHasJapanMedia(orderedPortfolio)
      ? formatReportJpyExchangeFootnote(isKo)
      : undefined,
    pricingFootnote: plannerReportPricingFootnote(isKo),
    quoteSummary,
    appendixSectionTitle: a.appendixSectionTitle,
    appendixMediaSpecs: a.appendixMediaSpecs,
    disclaimer: isKo
      ? "본 보고서는 THINKAD 내부 추정 모델 기반이며, 실제 집행 시 매체 재고·계약 조건에 따라 달라질 수 있습니다."
      : "This report uses THINKAD internal estimates; actual delivery may vary by inventory and terms.",
  };
}
