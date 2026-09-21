"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Lock, Mail, RefreshCw, Settings2 } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import {
  portfolioDailyByCategory,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { calculatePlan } from "@/lib/planner/calc/engine";
import { blendedCpmExcludingQuoteOnly, categoryCpmBarsExcludingQuoteOnly } from "@/lib/planner/quote-only-portfolio";
import { usePlannerStore } from "@/lib/planner/store";
import { plannerMediaPeriodLineWon } from "@/lib/planner/planner-media-quantity";
import type {
  PlannerAgeKey,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { buildReportPayload } from "@/lib/planner-report-export/build-report-payload";
import { planCartPortfolioPricing } from "@/lib/plan-cart-pricing";
import { buildReportBudgetHonesty } from "@/lib/planner/report-budget-honesty";
import {
  planCartRequestBudgetOverrideNotice,
  resolveEffectiveRequestedBudgetMan,
} from "@/lib/plan-cart-report/request-budget-override";
import { usePlanCartReportRequestBudgetOverride } from "@/hooks/use-plan-cart-report-request-budget-override";
import { PlanCartReportBudgetPanel } from "@/components/my/plan-cart-report-budget-panel";
import { splitPortfolioByCatalogChannel } from "@/lib/plan-cart-report/split-portfolio-by-channel";
import {
  buildDefaultExecutiveSummaryLines,
  buildDefaultReportGreeting,
  computeReportCopyFingerprint,
  isReportCopyStale,
  joinReportCopyLines,
  splitReportCopyParagraphs,
} from "@/lib/planner-report-export/report-copy";
import { buildOnlineReportCopyDraft } from "@/lib/planner-report-export/report-copy-online";
import { hasOnlinePricingSpec } from "@/lib/pricing-unavailable";
import { ReportCopyStaleBanner } from "@/components/planner/report-copy-stale-banner";
import { ReportEmailSendDialog } from "@/components/planner/report-email-send-dialog";
import {
  exportReachPendingLine,
  exportRoiPendingLine,
} from "@/lib/planner-report-export/export-kpi";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";
import { CONTACT_EMAIL } from "@/lib/constants";
import { useToast } from "@/components/toast-provider";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { PlannerReportPremiumBlock } from "@/components/planner/planner-report-premium-block";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  PlannerProGate,
  PlannerProLockedPlaceholder,
  PlannerProTeaserStats,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { PlannerReportInfoCard } from "@/components/planner/planner-report-info-card";
import { PlannerReportFreeSummary } from "@/components/planner/planner-report-free-summary";
import { PlannerPortfolioNotice } from "@/components/planner/planner-portfolio-notice";
import { PlannerProposalNarrative } from "@/components/planner/planner-proposal-narrative";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { plannerResultGateHint } from "@/lib/entitlements/tier-copy";
import { cn } from "@/lib/utils";
import { countMediaMatchingPlannerAgeKeys } from "@/lib/planner/parse-target-age";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type {
  PlannerExportChartDatum,
  PlannerExportRegionBreakdown,
} from "@/lib/planner-report-export/types";
import type { PlanReportActivitySource } from "@/lib/plan-report-activity/types";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import type {
  AppliedPlannerScenario,
  ScenarioVariant,
} from "@/lib/planner/scenario-types";
import type { RecommendationContext } from "@/lib/planner/recommendation-context";
import type { ScoredMedia as PlannerScoredMedia } from "@/lib/planner/recommend";
import { enrichPlannerPortfolioForExport, buildPlannerPortfolioScored } from "@/lib/planner/planner-portfolio-rationale";
import { rationaleLinesForLocale } from "@/lib/recommendation-adapters";
import { PlannerScenarioContextBanner } from "@/components/planner/planner-scenario-context-banner";
import { ReportExportSettingsPanel } from "@/components/planner/report-export-settings-panel";
import { usePlannerReportSectionVisibility } from "@/hooks/use-planner-report-section-visibility";
import { usePlannerReportStyle } from "@/hooks/use-planner-report-style";
import { usePlannerReportDocumentType } from "@/hooks/use-planner-report-document-type";
import { applyPlannerDocumentTypeToPayload } from "@/lib/planner-report-export/enrich-export-payload";
import {
  lineupViewModeForExport,
  readPlannerReportViewMode,
} from "@/lib/planner-report-view-mode";

export type PlannerReportSharedProps = {
  isKo: boolean;
  campaignGoal: PlannerCampaignGoal | null;
  goalTitle: string;
  budgetNum: number;
  /** my/plan 카트 — 사용자 입력 총예산(만원). 「요청 예산」 표시용 */
  requestedBudgetMan?: number;
  /** my/plan 카트 updatedAt — 요청 예산 override 스코프 */
  planCartUpdatedAt?: string;
  budgetTbd?: boolean;
  months: number;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  industryKey?: PlannerIndustryKey | null;
  seoulZones?: readonly PlannerSeoulZoneKey[];
  goalFollowUp?: PlannerGoalFollowUp;
  portfolio: MediaItem[];
  /** 서울 CPM·유동 벤치마크 — 공개 카탈로그 SSOT (my/plan 보고서 등) */
  benchmarkCatalog?: readonly MediaItem[];
  /** Step 4 선택 매체 수량 — 예산·노출·보고서 반영 */
  campaignMediaQuantities?: Record<string, number>;
  campaignMediaPriceOptionIndex?: Record<string, number>;
  /** 내 플랜 카트 — 복수 옵션 보고서 라벨 */
  planCartItems?: import("@/lib/plan-cart").PlanCartItem[];
  /** Step 7과 동일: 조건에 맞는 전체 후보(필터 결과) */
  matchedCount: number;
  /** Step 7과 동일: 1/3/6개월 총 노출 비교 */
  monthCompare: { months: number; totalImpressions: number }[];
  /** @deprecated 보고서는 portfolio 기준 cpmBars 를 내부 계산 — 하위 호환용 */
  cpmBars?: { key: string; label: string; value: number }[];
  metrics: PlannerMetrics | null;
  reachCorePct: number;
  reachExtendedPct: number;
  /** PR-9: PDF 내 합성 로고 이미지용 */
  logoUrl?: string | null;
  mediaPlacements?: Record<string, CompositeLogoPlacement>;
  /** 4단계에서 직접 담은 매체 수 (설계 포함 안내용) */
  selectedMediaCount?: number;
  portfolioOverBudget?: boolean;
  portfolioPeriodTotalMan?: number;
  portfolioBudgetMan?: number;
  isAutoPortfolio?: boolean;
  unresolvedMediaCount?: number;
  /** 내 플랜 보고서 — 지역별 예산·효과 */
  regionBreakdown?: PlannerExportRegionBreakdown[];
  regionBudgetCharts?: PlannerExportChartDatum[];
  regionImpressionCharts?: PlannerExportChartDatum[];
  /** 내 플랜 보고서 등 — PRO 없이도 미리보기·시뮬 텍스트 선명 표시 */
  unlockReportPreview?: boolean;
  /** 보고서 활동 로그 출처 (PDF/PPT 다운로드 추적) */
  activitySource?: PlanReportActivitySource;
  /** 제안 논리(Claude) API 요청용 — 미전달 시 블록 숨김 */
  narrativeContext?: {
    regions: string[];
    categories: PlannerCategory[];
    ageKeys: PlannerAgeKey[];
    industryKey: PlannerIndustryKey | null;
  };
  /** 시나리오 카드 적용 시 보고서 상단 맥락. 수동 진행 시 null */
  appliedScenario?: AppliedPlannerScenario | null;
  scenarioVariantLabels?: Record<ScenarioVariant, string>;
  /** Step 4 추천 컨텍스트 — 매체별 rationale formatter용 */
  recommendationContext?: RecommendationContext | null;
  /** formatter scored (화면 「왜 이 매체?」용, 미전달 시 recommendationContext로 계산) */
  scoredPortfolio?: readonly PlannerScoredMedia[];
  /** 문서 밖 지역 블록과 미리보기 동기화용 (미전달 시 Step 내부 state) */
  sectionVisibility?: Record<
    import("@/lib/planner-report-export/section-visibility").PlannerReportSectionKey,
    boolean
  >;
  onSectionVisibilityChange?: (
    next: Record<
      import("@/lib/planner-report-export/section-visibility").PlannerReportSectionKey,
      boolean
    >,
  ) => void;
};

function reportPortfolioPricing(props: PlannerReportSharedProps) {
  return {
    quantities: props.campaignMediaQuantities,
    priceOptionIndex: props.campaignMediaPriceOptionIndex,
  };
}

function resolvePlannerExportPortfolio(props: PlannerReportSharedProps): MediaItem[] {
  if (!props.recommendationContext || props.portfolio.length === 0) {
    return props.portfolio;
  }
  return enrichPlannerPortfolioForExport(
    props.portfolio,
    props.recommendationContext,
    props.isKo ? "ko" : "en",
  );
}

export function PlannerMediaRationaleBlock({
  isKo,
  scored,
}: {
  isKo: boolean;
  scored: readonly PlannerScoredMedia[];
}) {
  if (scored.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]">
        [ {isKo ? "왜 이 매체?" : "Why this media?"} ]
      </p>
      <ul className="mt-4 space-y-4">
        {scored.map((row) => {
          const name = isKo ? row.media.name : row.media.nameEn || row.media.name;
          const lines = rationaleLinesForLocale(
            row.rationaleLines,
            isKo ? "ko" : "en",
          );
          return (
            <li
              key={row.media.id}
              className="border-t border-border pt-4 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-foreground">{name}</p>
                <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "적합도" : "Fit"} {Math.round(row.score * 100)}
                </span>
              </div>
              {lines.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
                  {lines.slice(0, 3).map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function usePlannerReportDerived(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");

  const periodDisplay = useMemo(
    () =>
      formatPlannerPeriodDisplay(
        props.months,
        (key, values) =>
          values != null
            ? (t as (k: string, v?: Record<string, number>) => string)(key, values)
            : t(key),
      ),
    [props.months, t],
  );

  const reportPeriodCtx = useMemo(
    () => (props.months > 0 ? { months: props.months } : undefined),
    [props.months],
  );

  /**
   * A-1 Wave 4 — 예산 도넛·CPM 막대·총노출을 각각 계산하던 세 경로를
   * `calculatePlan` 하나로 합쳤다. payload 도 같은 엔진을 쓰므로
   * 화면과 PDF 가 구조적으로 같은 숫자를 본다.
   */
  const quantities = props.campaignMediaQuantities;
  const priceOptionIndex = props.campaignMediaPriceOptionIndex;
  const portfolio = props.portfolio;
  const months = props.months;
  const budgetNum = props.budgetNum;
  const isKo = props.isKo;

  const plan = useMemo(() => {
    const pricing = { quantities, priceOptionIndex };
    const ctx = reportPeriodCtx ?? { months: 1 };
    return calculatePlan({
      media: portfolio.map((m) => ({
        media: m,
        units: quantities?.[m.id],
        itemNet: plannerMediaPeriodLineWon(m, ctx, pricing, isKo),
      })),
      period: { kind: "months", months: months > 0 ? months : 1 },
      budgetWon: Math.max(0, budgetNum) * 10_000,
      locale: isKo ? "ko" : "en",
    });
  }, [
    portfolio,
    months,
    budgetNum,
    isKo,
    quantities,
    priceOptionIndex,
    reportPeriodCtx,
  ]);

  const budgetAllocation = useMemo(
    () =>
      plan.breakdown.byCategory
        .filter((s) => s.budgetAmount > 0)
        .map((s) => ({
          key: s.key,
          label: isKo ? s.labelKo : s.labelEn,
          pct: s.budgetShare,
          valueWon: s.budgetAmount,
          actualWon: s.budgetAmount,
        })),
    [plan, isKo],
  );

  const cpmBars = useMemo(
    () => categoryCpmBarsExcludingQuoteOnly(plan, portfolio, isKo),
    [plan, portfolio, isKo],
  );

  const portfolioReport = useMemo(
    () => ({
      monthlyImpressions: plan.impressions.monthlyEquivalent,
      totalImpressions: plan.impressions.campaignTotal,
      blendedCpmKrw:
        blendedCpmExcludingQuoteOnly(plan, portfolio) ?? plan.cpm.campaignWon,
    }),
    [plan, portfolio],
  );
  const usePortfolioReach =
    portfolio.length > 0 && portfolioReport.monthlyImpressions > 0;

  const blendedCpmKrw = portfolioReport.blendedCpmKrw;

  const dailyBars = useMemo(() => {
    const pts = portfolioDailyByCategory(props.portfolio);
    return pts.map((p) => ({
      key: p.key,
      label: props.isKo ? p.labelKo : p.labelEn,
      value: p.daily,
    }));
  }, [props.portfolio, props.isKo]);

  const effectSummaryLines = useMemo(() => {
    if (!props.metrics && portfolioReport.monthlyImpressions <= 0) return [];
    const monthlyImp = usePortfolioReach
      ? portfolioReport.monthlyImpressions
      : (props.metrics?.estimatedMonthlyImpressions ?? 0);
    const totalImp = usePortfolioReach
      ? portfolioReport.totalImpressions
      : (props.metrics?.estimatedTotalImpressions ?? 0);
    const lines: string[] = [
      t("reportSummaryImpMonthly", {
        n: monthlyImp.toLocaleString(),
      }),
      t("reportSummaryImpTotal", {
        n: totalImp.toLocaleString(),
      }),
      exportReachPendingLine(props.isKo),
    ];
    if (blendedCpmKrw != null) {
      lines.push(
        t("reportSummaryCpm", { n: blendedCpmKrw.toLocaleString() }),
      );
    }
    lines.push(exportRoiPendingLine(props.isKo));
    lines.push(t("reportSummaryDisclaimerShort"));
    return lines;
  }, [
    props.metrics,
    props.isKo,
    blendedCpmKrw,
    portfolioReport,
    usePortfolioReach,
    t,
  ]);

  const contact = useMemo(
    () => ({
      company: t("reportContactCompany"),
      phone: t("reportContactPhone"),
      email: CONTACT_EMAIL,
      address: t("reportContactAddress"),
    }),
    [t],
  );

  return useMemo(
    () => ({
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      dailyBars,
      cpmBars,
      effectSummaryLines,
      contact,
      planMediaItems: plan.mediaItems,
    }),
    [
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      dailyBars,
      cpmBars,
      effectSummaryLines,
      contact,
      plan.mediaItems,
    ],
  );
}

export default function PlannerReportStep(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const {
    allowed: plannerResultAllowed,
    loading: plannerResultLoading,
    access: plannerResultAccess,
  } = useFeatureAccess("planner_result");
  const previewUnlocked = props.unlockReportPreview === true;
  const showProPreview = previewUnlocked || plannerResultAllowed;
  const derived = usePlannerReportDerived(props);

  const ageTargetMatchCount = useMemo(() => {
    const keys = props.narrativeContext?.ageKeys ?? [];
    if (keys.filter((k) => k !== "ageAll").length === 0) return null;
    return countMediaMatchingPlannerAgeKeys(props.portfolio, keys);
  }, [props.narrativeContext?.ageKeys, props.portfolio]);

  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] =
    useState<PlannerReportExportFormat | null>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const portfolioForExport = useMemo(
    () => resolvePlannerExportPortfolio(props),
    [props.portfolio, props.recommendationContext, props.isKo],
  );

  const scoredForReport = useMemo(() => {
    if (props.scoredPortfolio?.length) return props.scoredPortfolio;
    if (!props.recommendationContext || props.portfolio.length === 0) return [];
    return buildPlannerPortfolioScored(
      props.portfolio,
      props.recommendationContext,
      props.isKo ? "ko" : "en",
    );
  }, [
    props.scoredPortfolio,
    props.portfolio,
    props.recommendationContext,
    props.isKo,
  ]);

  const reportClientName = usePlannerStore((s) => s.reportClientName);
  const setReportClientName = usePlannerStore((s) => s.setReportClientName);
  const reportDocumentTitle = usePlannerStore((s) => s.reportDocumentTitle);
  const setReportDocumentTitle = usePlannerStore((s) => s.setReportDocumentTitle);
  const reportGreeting = usePlannerStore((s) => s.reportGreeting);
  const setReportGreeting = usePlannerStore((s) => s.setReportGreeting);
  const reportExecutiveSummary = usePlannerStore((s) => s.reportExecutiveSummary);
  const setReportExecutiveSummary = usePlannerStore(
    (s) => s.setReportExecutiveSummary,
  );
  const reportGreetingTouched = usePlannerStore((s) => s.reportGreetingTouched);
  const reportExecutiveSummaryTouched = usePlannerStore(
    (s) => s.reportExecutiveSummaryTouched,
  );
  const reportCopyFingerprint = usePlannerStore((s) => s.reportCopyFingerprint);
  const applyReportCopyDraft = usePlannerStore((s) => s.applyReportCopyDraft);
  const acknowledgeReportCopyFingerprint = usePlannerStore(
    (s) => s.acknowledgeReportCopyFingerprint,
  );
  const creativeUploadedUrl = usePlannerStore((s) => s.creativeUploadedUrl);
  const [reportDocumentType, setReportDocumentType] =
    usePlannerReportDocumentType();

  const isPlanCartReport = props.activitySource === "plan_cart_report";

  const { overrideMan, setOverrideMan } = usePlanCartReportRequestBudgetOverride(
    isPlanCartReport ? props.planCartUpdatedAt : undefined,
  );

  const effectiveRequestedBudgetMan = useMemo(
    () =>
      resolveEffectiveRequestedBudgetMan({
        cartRequestedBudgetMan: props.requestedBudgetMan,
        budgetMan: props.budgetNum,
        overrideMan: isPlanCartReport ? overrideMan : null,
      }),
    [
      props.requestedBudgetMan,
      props.budgetNum,
      overrideMan,
      isPlanCartReport,
    ],
  );

  const planCartBudgetHonesty = useMemo(() => {
    if (!isPlanCartReport || props.budgetTbd) return undefined;
    const pricing = {
      quantities: props.campaignMediaQuantities,
      priceOptionIndex: props.campaignMediaPriceOptionIndex,
    };
    const periodCtx =
      props.months > 0 ? { months: props.months } : { months: 1 };
    const confirmedFromAllocation = derived.budgetAllocation.reduce(
      (sum, s) => sum + (s.actualWon ?? s.valueWon),
      0,
    );
    const requestWon = Math.max(0, effectiveRequestedBudgetMan) * 10_000;
    const honesty = buildReportBudgetHonesty({
      requestWon,
      portfolio: props.portfolio,
      pricing,
      periodCtx,
      isKo: props.isKo,
      confirmedMixWon:
        confirmedFromAllocation > 0 ? confirmedFromAllocation : undefined,
      planMetrics: { totalCostWon: confirmedFromAllocation },
    });
    if (!honesty) return undefined;
    const showOverrideNotice =
      overrideMan != null &&
      props.requestedBudgetMan != null &&
      Math.round(overrideMan) !== Math.round(props.requestedBudgetMan);
    return showOverrideNotice
      ? {
          ...honesty,
          requestBudgetOverrideNotice: planCartRequestBudgetOverrideNotice(
            props.isKo,
          ),
        }
      : honesty;
  }, [
    isPlanCartReport,
    props.budgetTbd,
    props.campaignMediaQuantities,
    props.campaignMediaPriceOptionIndex,
    props.months,
    props.portfolio,
    props.isKo,
    props.requestedBudgetMan,
    derived.budgetAllocation,
    effectiveRequestedBudgetMan,
    overrideMan,
  ]);

  const copyFingerprintCurrent = useMemo(() => {
    const cartPricing =
      props.planCartItems?.length != null && props.planCartItems.length > 0
        ? planCartPortfolioPricing({
            items: props.planCartItems,
            updatedAt: "",
          })
        : null;
    return computeReportCopyFingerprint({
      mediaIds: portfolioForExport.map((m) => m.id),
      quantities:
        props.campaignMediaQuantities ?? cartPricing?.quantities,
      priceOptionIndex:
        props.campaignMediaPriceOptionIndex ?? cartPricing?.priceOptionIndex,
    });
  }, [
    portfolioForExport,
    props.campaignMediaQuantities,
    props.campaignMediaPriceOptionIndex,
    props.planCartItems,
  ]);

  const executiveSummaryLines = useMemo(
    () => splitReportCopyParagraphs(reportExecutiveSummary),
    [reportExecutiveSummary],
  );

  const channelSplit = useMemo(
    () =>
      splitPortfolioByCatalogChannel(
        portfolioForExport,
        props.planCartItems ?? [],
      ),
    [portfolioForExport, props.planCartItems],
  );

  const onlineCopyStrategyInput = useMemo(() => {
    const portfolio = channelSplit.onlinePortfolio;
    const calculableLineCount = portfolio.filter(hasOnlinePricingSpec).length;
    return {
      isKo: props.isKo,
      campaignGoal: props.campaignGoal ?? null,
      goalTitle: props.goalTitle,
      industryKey:
        props.industryKey ?? props.narrativeContext?.industryKey ?? null,
      industryText: props.industryText,
      onlineLineCount: portfolio.length,
      calculableLineCount,
      inquiryLineCount: portfolio.length - calculableLineCount,
    };
  }, [
    channelSplit.onlinePortfolio,
    props.isKo,
    props.campaignGoal,
    props.goalTitle,
    props.industryKey,
    props.industryText,
    props.narrativeContext?.industryKey,
  ]);

  const mediaHintsForStrategy = useMemo(() => {
    if (portfolioForExport.length === 0) return [];
    return derived.planMediaItems.map((mi) => {
      const media = portfolioForExport.find((m) => m.id === mi.id);
      return {
        name: mi.name,
        location: media?.location ?? undefined,
        budgetPct: mi.budgetShare,
        cpmWon: mi.cpmWon,
      };
    });
  }, [derived.planMediaItems, portfolioForExport]);

  const topBudgetMedia = useMemo(() => {
    const withBudget = mediaHintsForStrategy
      .filter((h) => h.budgetPct > 0)
      .sort((a, b) => b.budgetPct - a.budgetPct);
    return withBudget[0] ?? null;
  }, [mediaHintsForStrategy]);

  const copyStrategyInput = useMemo(
    () => ({
      isKo: props.isKo,
      campaignGoal: props.campaignGoal ?? null,
      goalTitle: props.goalTitle,
      industryKey: props.industryKey ?? props.narrativeContext?.industryKey ?? null,
      industryText: props.industryText,
      regionsText: props.regionsText,
      seoulZones: props.seoulZones ?? [],
      followUp: props.goalFollowUp ?? {},
      portfolioCount: portfolioForExport.length,
      mediaHints: mediaHintsForStrategy,
      topMediaName:
        topBudgetMedia?.name ??
        (props.isKo ? "핵심 매체" : "key media"),
      topMediaBudgetPct: topBudgetMedia?.budgetPct,
    }),
    [props, portfolioForExport, mediaHintsForStrategy, topBudgetMedia],
  );

  useEffect(() => {
    if (
      !isPlanCartReport &&
      (reportGreetingTouched || reportExecutiveSummaryTouched)
    ) {
      return;
    }
    if (portfolioForExport.length === 0) return;

    if (channelSplit.composition === "onlyOnline") {
      const draft = buildOnlineReportCopyDraft({
        ...onlineCopyStrategyInput,
        clientName: reportClientName.trim() || undefined,
      });
      applyReportCopyDraft({
        greeting: draft.greeting,
        executiveSummary: draft.executiveSummary,
        fingerprint: copyFingerprintCurrent,
      });
      return;
    }

    const greeting = buildDefaultReportGreeting(
      props.isKo,
      reportClientName.trim() || undefined,
      reportDocumentType,
    );
    const executive = joinReportCopyLines(
      buildDefaultExecutiveSummaryLines(copyStrategyInput),
    );
    applyReportCopyDraft({
      greeting,
      executiveSummary: executive,
      fingerprint: copyFingerprintCurrent,
    });
  }, [
    isPlanCartReport,
    reportGreetingTouched,
    reportExecutiveSummaryTouched,
    portfolioForExport.length,
    channelSplit.composition,
    onlineCopyStrategyInput,
    copyFingerprintCurrent,
    copyStrategyInput,
    reportClientName,
    reportDocumentType,
    props.isKo,
    applyReportCopyDraft,
  ]);

  const copyStale = isReportCopyStale({
    copyFingerprint: reportCopyFingerprint,
    greetingTouched: reportGreetingTouched,
    executiveSummaryTouched: reportExecutiveSummaryTouched,
    currentFingerprint: copyFingerprintCurrent,
  });

  const regenerateReportCopy = useCallback(() => {
    if (channelSplit.composition === "onlyOnline") {
      const draft = buildOnlineReportCopyDraft({
        ...onlineCopyStrategyInput,
        clientName: reportClientName.trim() || undefined,
      });
      applyReportCopyDraft({
        greeting: draft.greeting,
        executiveSummary: draft.executiveSummary,
        fingerprint: copyFingerprintCurrent,
      });
      return;
    }

    const greeting = buildDefaultReportGreeting(
      props.isKo,
      reportClientName.trim() || undefined,
      reportDocumentType,
    );
    const executive = joinReportCopyLines(
      buildDefaultExecutiveSummaryLines(copyStrategyInput),
    );
    applyReportCopyDraft({
      greeting,
      executiveSummary: executive,
      fingerprint: copyFingerprintCurrent,
    });
  }, [
    channelSplit.composition,
    onlineCopyStrategyInput,
    props.isKo,
    reportClientName,
    reportDocumentType,
    copyStrategyInput,
    copyFingerprintCurrent,
    applyReportCopyDraft,
  ]);

  const payload = useMemo(
    () =>
      buildReportPayload({
        isKo: props.isKo,
        goalTitle: props.goalTitle,
        budgetMan: props.budgetNum,
        requestedBudgetMan: effectiveRequestedBudgetMan,
        budgetHonesty: planCartBudgetHonesty,
        periodDisplay: derived.periodDisplay,
        regionsText: props.regionsText,
        categoriesText: props.categoriesText,
        ageText: props.ageText,
        industryText: props.industryText,
        industryKey: props.industryKey ?? props.narrativeContext?.industryKey ?? null,
        campaignGoal: props.campaignGoal,
        seoulZones: props.seoulZones,
        goalFollowUp: props.goalFollowUp,
        portfolio: portfolioForExport,
        metrics: props.metrics,
        blendedCpmKrw: derived.blendedCpmKrw,
        budgetAllocation: derived.budgetAllocation,
        cpmBars: derived.cpmBars,
        effectSummaryLines: derived.effectSummaryLines,
        generatedAt: snapshotAt,
        months: props.months,
        regionBreakdown: props.regionBreakdown,
        regionBudgetCharts: props.regionBudgetCharts,
        regionImpressionCharts: props.regionImpressionCharts,
        isAutoPortfolio: props.isAutoPortfolio,
        campaignMediaQuantities: props.campaignMediaQuantities,
        campaignMediaPriceOptionIndex: props.campaignMediaPriceOptionIndex,
        planCartItems: props.planCartItems,
        benchmarkCatalog: props.benchmarkCatalog,
        reportGreeting,
        reportExecutiveSummaryLines: executiveSummaryLines,
        documentTypeKey: reportDocumentType,
      }),
    [
      props,
      derived,
      snapshotAt,
      portfolioForExport,
      reportGreeting,
      executiveSummaryLines,
      effectiveRequestedBudgetMan,
      planCartBudgetHonesty,
      reportDocumentType,
    ],
  );

  const exportPayload = useMemo(() => {
    const onlyOnlineCopy =
      payload.reportComposition === "onlyOnline"
        ? {
            greetingText: reportGreeting.trim() || payload.greetingText,
            executiveSummaryLines:
              executiveSummaryLines.length > 0
                ? executiveSummaryLines
                : payload.executiveSummaryLines,
          }
        : {};
    const merged = {
      ...payload,
      ...onlyOnlineCopy,
      clientName: reportClientName.trim() || undefined,
      coverLogoUrl:
        (creativeUploadedUrl ?? props.logoUrl)?.trim() || undefined,
      greetingText:
        reportGreeting.trim() || payload.greetingText || undefined,
      executiveSummaryLines:
        executiveSummaryLines.length > 0
          ? executiveSummaryLines
          : payload.executiveSummaryLines,
    };
    return applyPlannerDocumentTypeToPayload(merged, {
      isKo: props.isKo,
      documentType: reportDocumentType,
      documentTitleOverride: reportDocumentTitle,
    });
  }, [
    payload,
    reportDocumentTitle,
    reportClientName,
    reportGreeting,
    executiveSummaryLines,
    creativeUploadedUrl,
    props.logoUrl,
    props.isKo,
    reportDocumentType,
  ]);

  const [internalSectionVisibility, setInternalSectionVisibility] =
    usePlannerReportSectionVisibility();
  const [reportStyle, setReportStyle] = usePlannerReportStyle();
  const sectionVisibility =
    props.sectionVisibility ?? internalSectionVisibility;
  const setSectionVisibility =
    props.onSectionVisibilityChange ?? setInternalSectionVisibility;

  const handleExport = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (downloading) return;
      setDownloading(format);
      setError(null);
      try {
        await downloadPlannerReport(format, exportPayload, {
          activitySource: props.activitySource,
          sectionVisibility,
          lineupViewMode: lineupViewModeForExport(readPlannerReportViewMode()),
          style: reportStyle,
        });
        const { trackGaEvent } = await import("@/lib/ga-events");
        trackGaEvent("pdf_download", { source: `planner_report_${format}` });
        toast("success", t("reportPdfDownloaded"));
      } catch (e) {
        console.error("[planner-report-export]", e);
        const detail = e instanceof Error ? e.message : "";
        setError(detail || t("reportPdfError"));
        toast("error", detail || tCommon("pdfGenerationFailed"));
      } finally {
        setDownloading(null);
      }
    },
    [downloading, exportPayload, sectionVisibility, reportStyle, props.activitySource, t, tCommon, toast],
  );

  const openEmailDialog = useCallback(() => {
    setEmailSent(false);
    setEmailError(null);
    setEmailDialogOpen(true);
  }, []);

  const handleEmailSent = useCallback(
    ({ email }: { email: string; pdfFilename: string }) => {
      setEmailSent(true);
      setEmailSentTo(email);
      setEmailError(null);
      toast(
        "success",
        t("reportEmailSentDetail", { email }),
      );
    },
    [toast, t],
  );

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-8"
      data-screenshot="planner-report-unified"
    >
      <div className="space-y-2 text-center">
        <PlannerNeonLabel>Step 6 / Report</PlannerNeonLabel>
        <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
          {t("stepReportTitle")}
        </h2>
        <p className={plannerNeon.subtext}>{t("stepReportDesc")}</p>
      </div>

      <PlannerReportInfoCard isKo={props.isKo} />

      {isPlanCartReport && !props.budgetTbd ? (
        <PlanCartReportBudgetPanel
          isKo={props.isKo}
          cartUpdatedAt={props.planCartUpdatedAt}
          cartRequestedBudgetMan={props.requestedBudgetMan}
          budgetMan={props.budgetNum}
          budgetHonesty={planCartBudgetHonesty}
          overrideMan={overrideMan}
          onOverrideManChange={setOverrideMan}
        />
      ) : null}

      {props.appliedScenario && props.scenarioVariantLabels ? (
        <PlannerScenarioContextBanner
          scenario={props.appliedScenario}
          isKo={props.isKo}
          variantLabels={props.scenarioVariantLabels}
        />
      ) : null}

      <PlannerReportFreeSummary
        isKo={props.isKo}
        goalTitle={props.goalTitle}
        campaignGoal={props.campaignGoal}
        goalFollowUp={props.goalFollowUp}
        budgetNum={props.budgetNum}
        budgetTbd={props.budgetTbd}
        periodDisplay={derived.periodDisplay}
        regionsText={props.regionsText}
        categoriesText={props.categoriesText}
        ageText={props.ageText}
        industryText={props.industryText}
        portfolio={props.portfolio}
        portfolioRows={payload.portfolio}
      />

      {ageTargetMatchCount != null && props.ageText ? (
        <p className="text-sm text-muted-foreground">
          {props.isKo
            ? `타깃 연령 ${props.ageText} → 매체 targetAge 기준 매칭 ${ageTargetMatchCount}/${props.portfolio.length}개`
            : `Target ages ${props.ageText} → ${ageTargetMatchCount}/${props.portfolio.length} media match by targetAge`}
        </p>
      ) : null}

      <PlannerPortfolioNotice
        isKo={props.isKo}
        selectedCount={props.selectedMediaCount ?? props.portfolio.length}
        inPlanCount={props.portfolio.length}
        overBudget={props.portfolioOverBudget ?? false}
        periodTotalMan={props.portfolioPeriodTotalMan ?? 0}
        budgetMan={props.portfolioBudgetMan ?? 0}
        isAutoMix={props.isAutoPortfolio}
        unresolvedCount={props.unresolvedMediaCount ?? 0}
      />

      {scoredForReport.length > 0 ? (
        <PlannerMediaRationaleBlock isKo={props.isKo} scored={scoredForReport} />
      ) : null}

      {props.narrativeContext && props.portfolio.length > 0 ? (
        <PlannerProposalNarrative
          isKo={props.isKo}
          goal={props.campaignGoal}
          regions={props.narrativeContext.regions}
          categories={props.narrativeContext.categories}
          ageKey={props.narrativeContext.ageKeys[0] ?? "ageAll"}
          industryKey={props.narrativeContext.industryKey}
          budgetMan={props.budgetNum}
          months={props.months}
          portfolio={props.portfolio}
        />
      ) : null}

      {/* PRO — 미리보기·PDF (시뮬레이션은 Step 7 전용) */}
      <section className="space-y-3" data-screenshot="planner-pro-blur">
        <PlannerProGate
          isPro={showProPreview}
          loading={plannerResultLoading && !previewUnlocked}
          isKo={props.isKo}
          access={plannerResultAccess}
          feature="planner_result"
          minHeightClass="min-h-[24rem]"
          lockedPlaceholder={
            props.metrics ? (
              <PlannerProLockedPlaceholder isKo={props.isKo}>
                <PlannerProTeaserStats
                  isKo={props.isKo}
                  totalImpressions={props.metrics.estimatedTotalImpressions}
                  reachCorePct={props.reachCorePct}
                  roiExpected={props.metrics.roiExpected}
                  blurred={false}
                />
                <p className="text-center text-sm text-muted-foreground">
                  {plannerResultGateHint(props.isKo)}
                </p>
              </PlannerProLockedPlaceholder>
            ) : null
          }
        >
          {showProPreview ? (
            <div className="space-y-6">
              {copyStale ? (
                <ReportCopyStaleBanner
                  isKo={props.isKo}
                  onRegenerate={regenerateReportCopy}
                  onKeep={() =>
                    acknowledgeReportCopyFingerprint(copyFingerprintCurrent)
                  }
                />
              ) : null}
              <DocumentPreviewFrame>
                <PlannerReportDocument
                  payload={exportPayload}
                  mapPortfolio={props.portfolio}
                  sectionVisibility={sectionVisibility}
                  reportStyle={reportStyle}
                  editableTitle
                  onDocumentTitleChange={setReportDocumentTitle}
                  editableClientName
                  onClientNameChange={setReportClientName}
                  editableGreeting
                  onGreetingChange={setReportGreeting}
                  editableExecutiveSummary
                  onExecutiveSummaryChange={setReportExecutiveSummary}
                />
              </DocumentPreviewFrame>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm dark:border-white/12 dark:bg-white/5 dark:text-white/90 sm:hidden"
                onClick={() => {
                  const target = document.getElementById(
                    "planner-report-settings",
                  );
                  target?.scrollIntoView({ behavior: "smooth", block: "start" });
                  target
                    ?.querySelectorAll("details")
                    .forEach((el) => (el.open = true));
                }}
              >
                <Settings2 className="h-4 w-4" aria-hidden />
                {props.isKo
                  ? "문서 유형·스타일·섹션 설정"
                  : "Document type, style & section settings"}
              </button>

              <PlannerReportPremiumBlock
                isKo={props.isKo}
                portfolio={props.portfolio}
                budgetMan={props.budgetNum}
                months={props.months}
                regionsText={props.regionsText}
                goal={props.campaignGoal}
                industryText={props.industryText}
              />

              <PlannerNeonCard>
                <div
                  id="planner-report-settings"
                  className="flex scroll-mt-4 flex-col gap-4 border-b dark:border-white/10 border-gray-100 p-5 sm:p-6"
                >
                  <ReportExportSettingsPanel
                    isKo={props.isKo}
                    exportPayload={exportPayload}
                    mapPortfolio={props.portfolio}
                    documentType={reportDocumentType}
                    onDocumentTypeChange={setReportDocumentType}
                    reportStyle={reportStyle}
                    onReportStyleChange={setReportStyle}
                    sectionVisibility={sectionVisibility}
                    onSectionVisibilityChange={setSectionVisibility}
                  />
                </div>
                <div className="flex flex-col gap-4 border-b dark:border-white/10 border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div>
                    <PlannerNeonLabel>PDF Document</PlannerNeonLabel>
                    <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
                      {t("reportPdfDocumentTitle")}
                    </h3>
                    <p className={cn("mt-1", plannerNeon.subtext)}>
                      {t("reportPreviewDesc")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PlannerPdfDownloadGate
                      isKo={props.isKo}
                      onAllowedDownload={() => void handleExport("pdf")}
                    >
                      {({ onDownloadClick, pdfAllowed, checking }) => (
                        <BtnBlock
                          variant="secondary"
                          size="md"
                          onClick={onDownloadClick}
                          disabled={downloading !== null || checking}
                        >
                          {downloading === "pdf" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : !pdfAllowed ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          {!pdfAllowed
                            ? props.isKo
                              ? "🔒 플래너 보고서 PDF 저장"
                              : "🔒 Save planner report PDF"
                            : props.isKo
                              ? "플래너 보고서 PDF 저장"
                              : t("reportDownloadPdf")}
                        </BtnBlock>
                      )}
                    </PlannerPdfDownloadGate>
                    <PlannerPdfDownloadGate
                      isKo={props.isKo}
                      onAllowedDownload={() => void handleExport("pptx")}
                    >
                      {({ onDownloadClick, pdfAllowed, checking }) => (
                        <BtnBlock
                          variant="secondary"
                          size="md"
                          onClick={onDownloadClick}
                          disabled={downloading !== null || checking}
                        >
                          {downloading === "pptx" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : !pdfAllowed ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          {!pdfAllowed
                            ? props.isKo
                              ? "🔒 보고서 PPT 저장"
                              : "🔒 Save report PPT"
                            : props.isKo
                              ? "보고서 PPT 저장"
                              : "Save report PPT"}
                        </BtnBlock>
                      )}
                    </PlannerPdfDownloadGate>
                    <PlannerPdfDownloadGate
                      isKo={props.isKo}
                      onAllowedDownload={openEmailDialog}
                    >
                      {({ onDownloadClick, pdfAllowed, checking }) => (
                        <BtnBlock
                          variant="accent"
                          size="md"
                          onClick={onDownloadClick}
                          disabled={checking}
                        >
                          {!pdfAllowed ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          {emailSent
                            ? t("reportEmailSent")
                            : !pdfAllowed
                              ? props.isKo
                                ? "🔒 이메일로 보내기"
                                : "🔒 Email proposal"
                              : props.isKo
                                ? "이메일로 보내기"
                                : t("reportEmailMe")}
                        </BtnBlock>
                      )}
                    </PlannerPdfDownloadGate>
                    {emailError ? (
                      <p className="w-full text-sm font-medium text-rose-500" role="alert">
                        {emailError}
                      </p>
                    ) : emailSent ? (
                      <p className="w-full text-sm text-emerald-600 dark:text-emerald-400" role="status">
                        {t("reportEmailSentDetail", { email: emailSentTo })}
                      </p>
                    ) : (
                      <p className={cn("w-full text-xs", plannerNeon.subtext)}>
                        {t("reportEmailHint")}
                      </p>
                    )}
                    {error ? (
                      <BtnBlock
                        variant="primary"
                        size="md"
                        onClick={() => setError(null)}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("reportRetryPdf")}
                      </BtnBlock>
                    ) : null}
                  </div>
                </div>
                {error ? (
                  <div className="px-5 py-6 sm:px-6">
                    <PlannerNeonLabel>Error</PlannerNeonLabel>
                    <p className={cn("mt-2 font-bold", plannerNeon.headline)}>{error}</p>
                    <p className={cn("mt-1 text-sm", plannerNeon.subtext)}>
                      {t("reportPdfErrorHint")}
                    </p>
                  </div>
                ) : null}
              </PlannerNeonCard>
            </div>
          ) : null}
        </PlannerProGate>
      </section>

      <ReportEmailSendDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        isKo={props.isKo}
        exportPayload={exportPayload}
        activitySource={props.activitySource}
        sectionVisibility={sectionVisibility}
        lineupViewMode={lineupViewModeForExport(readPlannerReportViewMode())}
        onSent={handleEmailSent}
      />
    </div>
  );
}
