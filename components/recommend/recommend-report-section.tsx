"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, FileDown, Loader2, Lock, Sparkles } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import type { ScoredMedia, AiRecommendInput } from "@/lib/ai-media-recommend";
import type { RegionCheckboxCode } from "@/components/media-ai-recommend-form";
import {
  budgetSplitByCategory,
  computePortfolioReportMetrics,
  portfolioCpmByCategory,
} from "@/lib/planner-logic";
import { PLANNER_CAMPAIGN_GOAL_DEFS } from "@/lib/planner/campaign-goal-defs";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";
import {
  buildRecommendReportContext,
  computeRecommendReportMetrics,
  inferRecommendCategoriesText,
} from "@/lib/recommend/recommend-report-adapter";
import type {
  CampaignMediaPriceOptionIndex,
  CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";
import { PLANNER_INDUSTRY_LABELS } from "@/lib/planner/types";
import { useToast } from "@/components/toast-provider";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { PlannerEffectSimulationPanel } from "@/components/planner-effect-simulation-panel";
import { PlannerReportPremiumBlock } from "@/components/planner/planner-report-premium-block";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import { PlannerReportFreeSummary } from "@/components/planner/planner-report-free-summary";
import { PlannerPortfolioNotice } from "@/components/planner/planner-portfolio-notice";
import {
  PlannerNeonLabel,
  PlannerProGate,
  PlannerProTeaserStats,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { cn } from "@/lib/utils";
import { usePlannerReportSectionVisibility } from "@/hooks/use-planner-report-section-visibility";
import {
  lineupViewModeForExport,
  readPlannerReportViewMode,
} from "@/lib/planner-report-view-mode";

type Props = {
  isKo: boolean;
  locale: string;
  input: AiRecommendInput;
  regionCodes: readonly RegionCheckboxCode[];
  portfolio: MediaItem[];
  scoredPortfolio: ScoredMedia[];
  matchedCount: number;
  quantities: CampaignMediaQuantities;
  priceOptionIndex: CampaignMediaPriceOptionIndex;
  matchedPool: MediaItem[];
};

function RecommendMediaRationale({
  isKo,
  scoredPortfolio,
}: {
  isKo: boolean;
  scoredPortfolio: ScoredMedia[];
}) {
  if (scoredPortfolio.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-border bg-card p-5">
      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
        [ {isKo ? "왜 이 매체?" : "Why this media?"} ]
      </p>
      <ul className="mt-4 space-y-4">
        {scoredPortfolio.map((scored) => {
          const name = isKo
            ? scored.item.name
            : scored.item.nameEn || scored.item.name;
          const reasons = scored.reasons
            .map((r) => (isKo ? r.ko : r.en))
            .filter(Boolean);
          return (
            <li key={scored.item.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-foreground">{name}</p>
                <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {isKo ? "적합도" : "Fit"} {Math.round(scored.score)}
                </span>
              </div>
              {reasons.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm leading-relaxed text-muted-foreground">
                  {reasons.slice(0, 3).map((line) => (
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

export function RecommendReportSection({
  isKo,
  locale,
  input,
  regionCodes,
  portfolio,
  scoredPortfolio,
  matchedCount,
  quantities,
  priceOptionIndex,
  matchedPool,
}: Props) {
  const tPlanner = useTranslations("planner");
  const tr = useTranslations("recommend");
  const tm = useTranslations("media.ai");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const {
    allowed: plannerResultAllowed,
    loading: plannerResultLoading,
    access: plannerResultAccess,
  } = useFeatureAccess("planner_result");
  const [downloading, setDownloading] =
    useState<PlannerReportExportFormat | null>(null);
  const [sectionVisibility] = usePlannerReportSectionVisibility();
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(isKo ? "ko-KR" : "en-US"),
  );

  const ageText = useMemo(() => {
    const keyMap = {
      genz: "targetGenz",
      millennial: "targetMillennial",
      family: "targetFamily",
      biz: "targetBiz",
      mass: "targetMass",
    } as const;
    return tm(keyMap[input.target] ?? "targetMass");
  }, [input.target, tm]);

  const typeCategoryText = useMemo(() => {
    if (!input.type || input.type === "all") {
      return inferRecommendCategoriesText(portfolio, isKo);
    }
    const map: Record<string, string> = isKo
      ? { digital: "디지털", static: "고정형", mobile: "이동형", network: "네트워크" }
      : { digital: "Digital", static: "Static", mobile: "Mobile", network: "Network" };
    return map[input.type] ?? input.type;
  }, [input.type, portfolio, isKo]);

  const reportContext = useMemo(
    () =>
      buildRecommendReportContext({
        input,
        regionCodes,
        portfolio,
        quantities,
        priceOptionIndex,
        locale,
        nationalShort: tPlanner("regionNationalShort"),
        categoriesText: typeCategoryText,
      }),
    [
      input,
      regionCodes,
      portfolio,
      quantities,
      priceOptionIndex,
      locale,
      tPlanner,
      typeCategoryText,
    ],
  );

  const metricsBundle = useMemo(
    () =>
      computeRecommendReportMetrics({
        portfolio,
        matchedPool,
        context: reportContext,
      }),
    [portfolio, matchedPool, reportContext],
  );

  const goalTitle = useMemo(() => {
    const def = PLANNER_CAMPAIGN_GOAL_DEFS.find(
      (g) => g.key === reportContext.campaignGoal,
    );
    return def ? tPlanner(def.titleKey) : "—";
  }, [reportContext.campaignGoal, tPlanner]);

  const industryText =
    PLANNER_INDUSTRY_LABELS[reportContext.industryKey][isKo ? "ko" : "en"];

  const periodDisplay = useMemo(
    () =>
      formatPlannerPeriodDisplay(reportContext.months, (key, values) =>
        values != null
          ? (tPlanner as (k: string, v?: Record<string, number>) => string)(
              key,
              values,
            )
          : tPlanner(key),
      ),
    [reportContext.months, tPlanner],
  );

  const portfolioPricing = reportContext.pricing;

  const budgetAllocation = useMemo(() => {
    const slices = budgetSplitByCategory(portfolio, portfolioPricing);
    return slices.map((s) => ({
      key: s.key,
      label: isKo ? s.labelKo : s.labelEn,
      pct: s.pct,
      valueWon: s.value,
      actualWon: s.actualWon,
    }));
  }, [portfolio, portfolioPricing, isKo]);

  const cpmBars = useMemo(() => {
    const pts = portfolioCpmByCategory(portfolio, portfolioPricing);
    return pts.map((p) => ({
      key: p.key,
      label: isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }));
  }, [portfolio, portfolioPricing, isKo]);

  const portfolioReport = useMemo(
    () =>
      computePortfolioReportMetrics(
        portfolio,
        reportContext.months,
        portfolioPricing,
      ),
    [portfolio, reportContext.months, portfolioPricing],
  );

  const blendedCpmKrw = portfolioReport.blendedCpmKrw;
  const usePortfolioReach =
    portfolio.length > 0 && portfolioReport.monthlyImpressions > 0;

  const effectSummaryLines = useMemo(() => {
    const metrics = metricsBundle.metrics;
    if (!metrics && portfolioReport.monthlyImpressions <= 0) return [];
    const monthlyImp = usePortfolioReach
      ? portfolioReport.monthlyImpressions
      : (metrics?.estimatedMonthlyImpressions ?? 0);
    const totalImp = usePortfolioReach
      ? portfolioReport.totalImpressions
      : (metrics?.estimatedTotalImpressions ?? 0);
    const lines: string[] = [
      tPlanner("reportSummaryImpMonthly", {
        n: monthlyImp.toLocaleString(),
      }),
      tPlanner("reportSummaryImpTotal", {
        n: totalImp.toLocaleString(),
      }),
      tPlanner("reportSummaryReach", {
        core: metricsBundle.reachCorePct,
        ext: metricsBundle.reachExtendedPct,
      }),
    ];
    if (blendedCpmKrw != null) {
      lines.push(
        tPlanner("reportSummaryCpm", { n: blendedCpmKrw.toLocaleString() }),
      );
    }
    if (metrics) {
      lines.push(tPlanner("reportSummaryRoi", { n: metrics.roiExpected }));
    }
    lines.push(tPlanner("reportSummaryDisclaimerShort"));
    return lines;
  }, [
    metricsBundle.metrics,
    metricsBundle.reachCorePct,
    metricsBundle.reachExtendedPct,
    blendedCpmKrw,
    portfolioReport,
    usePortfolioReach,
    tPlanner,
  ]);

  const payload = useMemo(
    () =>
      buildOohReportPayload({
        isKo,
        goalTitle,
        budgetMan: reportContext.budgetNum,
        periodDisplay,
        regionsText: reportContext.regionsText,
        categoriesText: reportContext.categoriesText,
        ageText,
        industryText,
        industryKey: reportContext.industryKey,
        campaignGoal: reportContext.campaignGoal,
        seoulZones: input.seoulZones ?? undefined,
        goalFollowUp: {},
        portfolio,
        metrics: metricsBundle.metrics,
        reachCorePct: metricsBundle.reachCorePct,
        reachExtendedPct: metricsBundle.reachExtendedPct,
        blendedCpmKrw,
        budgetAllocation,
        cpmBars,
        effectSummaryLines,
        generatedAt: snapshotAt,
        months: reportContext.months,
        isAutoPortfolio: false,
        campaignMediaQuantities: quantities,
        campaignMediaPriceOptionIndex: priceOptionIndex,
      }),
    [
      isKo,
      goalTitle,
      reportContext,
      periodDisplay,
      ageText,
      industryText,
      input.seoulZones,
      portfolio,
      metricsBundle,
      blendedCpmKrw,
      budgetAllocation,
      cpmBars,
      effectSummaryLines,
      snapshotAt,
      quantities,
      priceOptionIndex,
    ],
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

  const handleExport = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (downloading) return;
      setDownloading(format);
      try {
        await downloadPlannerReport(format, exportPayload, {
          activitySource: "ai_recommend",
          sectionVisibility,
          lineupViewMode: lineupViewModeForExport(readPlannerReportViewMode()),
        });
        toast("success", tPlanner("reportPdfDownloaded"));
      } catch (e) {
        console.error("[recommend-report-export]", e);
        const detail = e instanceof Error ? e.message : "";
        toast("error", detail || tCommon("pdfGenerationFailed"));
      } finally {
        setDownloading(null);
      }
    },
    [
      downloading,
      exportPayload,
      sectionVisibility,
      toast,
      tPlanner,
      tCommon,
    ],
  );

  if (portfolio.length === 0) return null;

  const { metrics, portfolioBudgetStatus } = metricsBundle;

  return (
    <section className="mt-10 border-t-2 border-border pt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-violet-500/40 bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-violet-500" />
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-violet-600 dark:text-violet-300">
              [ {isKo ? "AI 효과 보고서" : "AI effect report"} ]
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {isKo ? "효과 보고서 보기" : "View effect report"}
            </h2>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="mt-6 space-y-6">
          {metrics ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: isKo ? "월간 노출(추정)" : "Est. monthly reach",
                  value: metrics.estimatedMonthlyImpressions.toLocaleString(),
                },
                {
                  label: isKo ? "총 노출(추정)" : "Est. total reach",
                  value: metrics.estimatedTotalImpressions.toLocaleString(),
                },
                {
                  label: isKo ? "핵심 도달" : "Core reach",
                  value: `${metricsBundle.reachCorePct}%`,
                },
                {
                  label: isKo ? "기대 ROI" : "Expected ROI",
                  value: `${metrics.roiExpected}${isKo ? "배" : "×"}`,
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border-2 border-border bg-card p-4"
                >
                  <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <PlannerReportFreeSummary
            isKo={isKo}
            goalTitle={goalTitle}
            campaignGoal={reportContext.campaignGoal}
            budgetNum={reportContext.budgetNum}
            periodDisplay={periodDisplay}
            regionsText={reportContext.regionsText}
            categoriesText={reportContext.categoriesText}
            ageText={ageText}
            industryText={industryText}
            portfolio={portfolio}
          />

          <RecommendMediaRationale
            isKo={isKo}
            scoredPortfolio={scoredPortfolio}
          />

          <PlannerPortfolioNotice
            isKo={isKo}
            selectedCount={portfolio.length}
            inPlanCount={portfolio.length}
            overBudget={portfolioBudgetStatus.overBudget}
            monthlyTotalMan={portfolioBudgetStatus.monthlyTotalMan}
            monthlyBudgetMan={portfolioBudgetStatus.monthlyBudgetMan}
            isAutoMix={false}
            unresolvedCount={0}
          />

          <section className="space-y-3" data-screenshot="recommend-pro-report">
            <PlannerProGate
              isPro={plannerResultAllowed}
              loading={plannerResultLoading}
              isKo={isKo}
              access={plannerResultAccess}
              feature="planner_result"
              minHeightClass="min-h-[24rem]"
            >
              <div className="space-y-6">
                {metrics && !plannerResultAllowed ? (
                  <PlannerProTeaserStats
                    isKo={isKo}
                    totalImpressions={metrics.estimatedTotalImpressions}
                    reachCorePct={metricsBundle.reachCorePct}
                    roiExpected={metrics.roiExpected}
                  />
                ) : null}

                <DocumentPreviewFrame>
                  <PlannerReportDocument
                    payload={exportPayload}
                    mapPortfolio={portfolio}
                    sectionVisibility={sectionVisibility}
                    editableTitle
                    onDocumentTitleChange={setDocumentTitle}
                  />
                </DocumentPreviewFrame>

                {metrics ? (
                  <div
                    className={cn(
                      plannerNeon.kpiCard,
                      "mx-auto max-w-md text-center",
                    )}
                  >
                    <p className={plannerNeon.kpiLabel}>
                      {isKo
                        ? "총 예상 노출수 (대략)"
                        : "Est. total impressions (approx.)"}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-3xl font-bold tabular-nums text-cyan-400",
                      )}
                    >
                      {metrics.estimatedTotalImpressions.toLocaleString()}
                    </p>
                  </div>
                ) : null}

                <PlannerReportPremiumBlock
                  isKo={isKo}
                  portfolio={portfolio}
                  budgetMan={reportContext.budgetNum}
                  months={reportContext.months}
                  regionsText={reportContext.regionsText}
                  goal={reportContext.campaignGoal}
                  industryText={industryText}
                />

                <PlannerEffectSimulationPanel
                  isKo={isKo}
                  portfolio={portfolio}
                  budgetMan={reportContext.budgetNum}
                  months={reportContext.months}
                  totalImpressionsFromMetrics={
                    metrics?.estimatedTotalImpressions ?? null
                  }
                  skipProGate
                />

                <div className="rounded-2xl border-2 border-border bg-card p-5">
                  <PlannerNeonLabel>PDF Document</PlannerNeonLabel>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tPlanner("reportPreviewDesc")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <PlannerPdfDownloadGate
                      isKo={isKo}
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
                          {isKo ? "효과 보고서 PDF 저장" : "Save effect report PDF"}
                        </BtnBlock>
                      )}
                    </PlannerPdfDownloadGate>
                    <PlannerPdfDownloadGate
                      isKo={isKo}
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
                          {isKo ? "보고서 PPT 저장" : "Save report PPT"}
                        </BtnBlock>
                      )}
                    </PlannerPdfDownloadGate>
                  </div>
                </div>
              </div>
            </PlannerProGate>
          </section>

          <p className="text-center text-xs text-muted-foreground">
            {isKo
              ? `조건 일치 매체 ${matchedCount.toLocaleString()}건 · 보고서 기준 ${portfolio.length}건`
              : `${matchedCount.toLocaleString()} matched · report covers ${portfolio.length} media`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
