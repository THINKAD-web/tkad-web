"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Lock, Mail, RefreshCw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  computePortfolioReportMetrics,
  portfolioCpmByCategory,
  portfolioDailyByCategory,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import type {
  PlannerAgeKey,
  PlannerCategory,
  PlannerIndustryKey,
} from "@/lib/planner/types";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
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
import { ReportSectionVisibilityPanel } from "@/components/planner/report-section-visibility-panel";
import { usePlannerReportSectionVisibility } from "@/hooks/use-planner-report-section-visibility";
import {
  lineupViewModeForExport,
  readPlannerReportViewMode,
} from "@/lib/planner-report-view-mode";

export type PlannerReportSharedProps = {
  isKo: boolean;
  campaignGoal: PlannerCampaignGoal | null;
  goalTitle: string;
  budgetNum: number;
  months: number;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  industryKey?: PlannerIndustryKey | null;
  seoulZones?: readonly PlannerSeoulZoneKey[];
  goalFollowUp?: PlannerGoalFollowUp;
  portfolio: MediaItem[];
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
  portfolioMonthlyTotalMan?: number;
  portfolioMonthlyBudgetMan?: number;
  isAutoPortfolio?: boolean;
  unresolvedMediaCount?: number;
  /** 내 플랜 보고서 — 지역별 예산·효과 */
  regionBreakdown?: PlannerExportRegionBreakdown[];
  regionBudgetCharts?: PlannerExportChartDatum[];
  regionImpressionCharts?: PlannerExportChartDatum[];
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

  const budgetAllocation = useMemo(() => {
    const slices = budgetSplitByCategory(
      props.portfolio,
      reportPortfolioPricing(props),
      reportPeriodCtx,
    );
    return slices.map((s) => ({
      key: s.key,
      label: props.isKo ? s.labelKo : s.labelEn,
      pct: s.pct,
      valueWon: s.value,
      actualWon: s.actualWon,
    }));
  }, [
    props.portfolio,
    props.isKo,
    props.campaignMediaQuantities,
    props.campaignMediaPriceOptionIndex,
    reportPeriodCtx,
  ]);

  const cpmBars = useMemo(() => {
    const pts = portfolioCpmByCategory(
      props.portfolio,
      reportPortfolioPricing(props),
      reportPeriodCtx,
    );
    return pts.map((p) => ({
      key: p.key,
      label: props.isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }));
  }, [
    props.portfolio,
    props.isKo,
    props.campaignMediaQuantities,
    props.campaignMediaPriceOptionIndex,
    reportPeriodCtx,
  ]);

  const portfolioReport = useMemo(
    () =>
      computePortfolioReportMetrics(
        props.portfolio,
        props.months,
        reportPortfolioPricing(props),
        reportPeriodCtx,
      ),
    [
      props.portfolio,
      props.months,
      props.campaignMediaQuantities,
      props.campaignMediaPriceOptionIndex,
      reportPeriodCtx,
    ],
  );
  const usePortfolioReach =
    props.portfolio.length > 0 && portfolioReport.monthlyImpressions > 0;

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
      t("reportSummaryReach", {
        core: props.reachCorePct,
        ext: props.reachExtendedPct,
      }),
    ];
    if (blendedCpmKrw != null) {
      lines.push(
        t("reportSummaryCpm", { n: blendedCpmKrw.toLocaleString() }),
      );
    }
    if (props.metrics) {
      lines.push(
        t("reportSummaryRoi", { n: props.metrics.roiExpected }),
      );
    }
    lines.push(t("reportSummaryDisclaimerShort"));
    return lines;
  }, [
    props.metrics,
    props.reachCorePct,
    props.reachExtendedPct,
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
    }),
    [
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      dailyBars,
      cpmBars,
      effectSummaryLines,
      contact,
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
  const [userEmail, setUserEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
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

  const payload = useMemo(
    () =>
      buildOohReportPayload({
        isKo: props.isKo,
        goalTitle: props.goalTitle,
        budgetMan: props.budgetNum,
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
        reachCorePct: props.reachCorePct,
        reachExtendedPct: props.reachExtendedPct,
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
      }),
    [props, derived, snapshotAt, portfolioForExport],
  );

  const [documentTitle, setDocumentTitle] = useState(payload.documentTitle);

  useEffect(() => {
    setDocumentTitle(payload.documentTitle);
  }, [payload.documentTitle]);

  const exportPayload = useMemo(
    () => ({
      ...payload,
      documentTitle: documentTitle.trim() || payload.documentTitle,
    }),
    [payload, documentTitle],
  );

  const [internalSectionVisibility, setInternalSectionVisibility] =
    usePlannerReportSectionVisibility();
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
    [downloading, exportPayload, sectionVisibility, props.activitySource, t, tCommon, toast],
  );

  const sendEmailReport = useCallback(async () => {
    const email = userEmail.trim();
    if (
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      toast("error", props.isKo ? "올바른 이메일을 입력하세요" : "Please enter a valid email");
      return;
    }
    setEmailSending(true);
    setEmailSent(false);
    setEmailError(null);
    try {
      const res = await fetch("/api/planner/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: email,
          goalTitle: props.goalTitle,
          budgetNum: props.budgetNum,
          periodDisplay: derived.periodDisplay,
          regionsText: props.regionsText,
          categoriesText: props.categoriesText,
          ageText: props.ageText,
          industryText: props.industryText,
          mediaList: props.portfolio.map((m) => ({
            name: props.isKo ? m.name : (m.nameEn || m.name),
            price: m.price,
            location: m.location,
          })),
          metrics: props.metrics
            ? {
                ...props.metrics,
                impressions: props.metrics.estimatedTotalImpressions,
                reach: Math.round(props.metrics.blendDailyReach * 30),
              }
            : undefined,
          screenshot: "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };
      if (!res.ok) {
        const message =
          res.status === 503
            ? t("reportEmailNotConfigured")
            : res.status === 401
              ? t("reportEmailLoginRequired")
              : res.status === 403
                ? t("reportEmailProRequired")
                : data.error || t("reportEmailFailed");
        setEmailError(message);
        toast("error", message);
        return;
      }
      setEmailSent(true);
      toast(
        "success",
        t("reportEmailSentDetail", { email }),
      );
    } catch {
      const message = t("reportEmailFailed");
      setEmailError(message);
      toast("error", message);
    } finally {
      setEmailSending(false);
    }
  }, [
    userEmail,
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.regionsText,
    props.categoriesText,
    props.ageText,
    props.industryText,
    props.portfolio,
    props.metrics,
    derived.periodDisplay,
    toast,
    t,
  ]);

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
        monthlyTotalMan={props.portfolioMonthlyTotalMan ?? 0}
        monthlyBudgetMan={props.portfolioMonthlyBudgetMan ?? 0}
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
          isPro={plannerResultAllowed}
          loading={plannerResultLoading}
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
                  {props.isKo
                    ? "로그인·PRO 구독 후 전체 보고서, PDF·시뮬레이션을 확인할 수 있습니다."
                    : "Sign in with PRO to unlock the full report, PDF export, and simulation."}
                </p>
              </PlannerProLockedPlaceholder>
            ) : null
          }
        >
          {plannerResultAllowed ? (
            <div className="space-y-6">
              <DocumentPreviewFrame>
                <PlannerReportDocument
                  payload={exportPayload}
                  mapPortfolio={props.portfolio}
                  sectionVisibility={sectionVisibility}
                  editableTitle
                  onDocumentTitleChange={setDocumentTitle}
                />
              </DocumentPreviewFrame>

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
                <div className="flex flex-col gap-4 border-b dark:border-white/10 border-gray-100 p-5 sm:p-6">
                  <ReportSectionVisibilityPanel
                    isKo={props.isKo}
                    payload={exportPayload}
                    mapPortfolio={props.portfolio}
                    visibility={sectionVisibility}
                    onChange={setSectionVisibility}
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="email"
                        placeholder={props.isKo ? "이메일 주소" : "Email address"}
                        value={userEmail}
                        onChange={(e) => {
                          setUserEmail(e.target.value);
                          setEmailSent(false);
                          setEmailError(null);
                        }}
                        className={cn(
                          "h-10 w-full min-w-[14rem] rounded-xl border px-3 text-sm",
                          "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                          "dark:text-white text-gray-900 placeholder:dark:text-white/40 placeholder:text-gray-400",
                          "focus:border-[color:var(--qp-accent)]/60 focus:outline-none sm:w-56",
                        )}
                      />
                      <PlannerPdfDownloadGate
                        isKo={props.isKo}
                        onAllowedDownload={() => void sendEmailReport()}
                      >
                        {({ onDownloadClick, pdfAllowed, checking }) => (
                          <BtnBlock
                            variant="accent"
                            size="md"
                            onClick={onDownloadClick}
                            disabled={emailSending || checking}
                          >
                            {emailSending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : !pdfAllowed ? (
                              <Lock className="h-4 w-4" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                            {emailSent
                              ? t("reportEmailSent")
                              : !pdfAllowed
                                ? props.isKo
                                  ? "🔒 이메일로 받기"
                                  : "🔒 Email report"
                                : t("reportEmailMe")}
                          </BtnBlock>
                        )}
                      </PlannerPdfDownloadGate>
                    </div>
                    {emailError ? (
                      <p className="text-sm font-medium text-rose-500" role="alert">
                        {emailError}
                      </p>
                    ) : emailSent ? (
                      <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
                        {t("reportEmailSentDetail", { email: userEmail.trim() })}
                      </p>
                    ) : (
                      <p className={cn("text-xs", plannerNeon.subtext)}>
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
    </div>
  );
}

/** 대시보드(7단계) 하단: PDF 다운로드만 (상세 보고서는 6단계 통합) */
export function PlannerReportPdfCompact(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { allowed: pdfAllowed, loading: pdfAccessLoading } =
    useFeatureAccess("planner_pdf");
  const derived = usePlannerReportDerived(props);
  const [downloading, setDownloading] =
    useState<PlannerReportExportFormat | null>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );

  const [internalSectionVisibility, setInternalSectionVisibility] =
    usePlannerReportSectionVisibility();
  const sectionVisibility =
    props.sectionVisibility ?? internalSectionVisibility;

  const portfolioForExport = useMemo(
    () => resolvePlannerExportPortfolio(props),
    [props.portfolio, props.recommendationContext, props.isKo],
  );

  const handleExport = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (downloading) return;
      setDownloading(format);
      try {
        const payload = buildOohReportPayload({
          isKo: props.isKo,
          goalTitle: props.goalTitle,
          budgetMan: props.budgetNum,
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
          reachCorePct: props.reachCorePct,
          reachExtendedPct: props.reachExtendedPct,
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
        });
        await downloadPlannerReport(format, payload, {
          activitySource: props.activitySource,
          sectionVisibility,
          lineupViewMode: lineupViewModeForExport(readPlannerReportViewMode()),
        });
        const { trackGaEvent } = await import("@/lib/ga-events");
        trackGaEvent("pdf_download", {
          source: `planner_report_compact_${format}`,
        });
        toast("success", t("reportPdfDownloaded"));
      } catch (e) {
        console.error("[planner-report-export compact]", e);
        toast("error", tCommon("pdfGenerationFailed"));
      } finally {
        setDownloading(null);
      }
    },
    [downloading, props, derived, snapshotAt, sectionVisibility, portfolioForExport, t, tCommon, toast],
  );

  if (pdfAccessLoading) {
    return (
      <div
        className="min-h-[8rem] animate-pulse rounded-2xl border dark:border-white/8 border-gray-100 dark:bg-white/5 bg-gray-100/80"
        aria-busy="true"
      />
    );
  }

  if (!pdfAllowed) return null;

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>PDF Export</PlannerNeonLabel>
        <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
          {t("reportPdfDocumentTitle")}
        </h3>
        <p className={cn("mt-1", plannerNeon.subtext)}>
          {props.isKo
            ? "통합 플래너 보고서를 PDF로 저장합니다."
            : "Save the unified planner report as PDF."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 p-5 sm:p-6">
        <PlannerPdfDownloadGate
          isKo={props.isKo}
          onAllowedDownload={() => void handleExport("pdf")}
        >
          {({ onDownloadClick, pdfAllowed, checking }) => (
            <BtnBlock
              variant="accent"
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
      </div>
    </PlannerNeonCard>
  );
}
