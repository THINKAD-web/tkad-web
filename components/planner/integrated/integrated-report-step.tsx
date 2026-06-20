"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { reachSplitForGoal } from "@/lib/planner-logic";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { buildIntegratedReportPayload } from "@/lib/planner-report-export/payload-integrated";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";
import { useToast } from "@/components/toast-provider";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { IntegratedReportInfoCard } from "@/components/planner/integrated/integrated-report-info-card";
import { PlannerReportFreeSummary } from "@/components/planner/planner-report-free-summary";
import { PlannerEffectSimulationPanel } from "@/components/planner-effect-simulation-panel";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  PlannerProGate,
  PlannerProTeaserStats,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  campaignGoal: PlannerCampaignGoal | null;
  goalTitle: string;
  budgetNum: number;
  months: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
  digitalResult: DigitalRecommendResult;
  metrics: IntegratedCampaignMetrics;
  logoUrl?: string | null;
  mediaPlacements?: Record<string, CompositeLogoPlacement>;
};

export function IntegratedReportStep(props: Props) {
  const t = useTranslations("plannerIntegrated");
  const tPlanner = useTranslations("planner");
  const { toast } = useToast();
  const {
    allowed: plannerResultAllowed,
    loading: plannerResultLoading,
    access: plannerResultAccess,
  } = useFeatureAccess("planner_result");
  const { allowed: pdfAllowed, loading: pdfAccessLoading } =
    useFeatureAccess("planner_pdf");
  const [downloading, setDownloading] = useState<PlannerReportExportFormat | null>(
    null,
  );

  const generatedAt = new Intl.DateTimeFormat(props.isKo ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const payload = useMemo(
    () =>
      buildIntegratedReportPayload({
        isKo: props.isKo,
        goal: props.campaignGoal,
        goalTitle: props.goalTitle,
        budgetMan: props.budgetNum,
        periodDisplay: props.periodDisplay,
        regionsText: props.regionsText,
        categoriesText: props.categoriesText,
        ageText: props.ageText,
        industryText: props.industryText,
        portfolio: props.portfolio,
        digitalResult: props.digitalResult,
        metrics: props.metrics,
        generatedAt,
        includeProSections: plannerResultAllowed,
        months: props.months,
      }),
    [props, generatedAt, plannerResultAllowed],
  );

  const handleDownload = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (!pdfAllowed || downloading || pdfAccessLoading) return;
      setDownloading(format);
      try {
        await downloadPlannerReport(format, payload, {
          activitySource: "integrated_planner",
        });
        toast("success", t("pdfDownloaded"));
      } catch (e) {
        console.error("[integrated-report-export]", e);
        const detail = e instanceof Error ? e.message : "";
        toast("error", detail || t("pdfFailed"));
      } finally {
        setDownloading(null);
      }
    },
    [pdfAllowed, pdfAccessLoading, downloading, payload, toast, t],
  );

  const reachSplit = reachSplitForGoal(props.campaignGoal);

  return (
    <div
      className="mx-auto w-full space-y-8"
      data-screenshot="integrated-planner-report"
    >
      <div className="space-y-2 text-center sm:text-left">
        <PlannerNeonLabel>Step 7 / Report</PlannerNeonLabel>
        <h2 className={cn("text-xl sm:text-2xl", plannerNeon.headline)}>
          {t("reportTitle")}
        </h2>
        <p className={plannerNeon.subtext}>{t("reportDesc")}</p>
      </div>

      <IntegratedReportInfoCard isKo={props.isKo} />

      <PlannerReportFreeSummary
        isKo={props.isKo}
        goalTitle={props.goalTitle}
        budgetNum={props.budgetNum}
        periodDisplay={props.periodDisplay}
        regionsText={props.regionsText}
        categoriesText={props.categoriesText}
        ageText={props.ageText}
        industryText={props.industryText}
        portfolio={props.portfolio}
      />

      <section className="space-y-6">
        <PlannerProGate
          isPro={plannerResultAllowed}
          loading={plannerResultLoading}
          isKo={props.isKo}
          access={plannerResultAccess}
          feature="planner_result"
          minHeightClass="min-h-[24rem]"
        >
            <div className="space-y-6">
              <PlannerProTeaserStats
                isKo={props.isKo}
                totalImpressions={props.metrics.oohImpressions}
                reachCorePct={reachSplit.corePct}
                roiExpected={props.metrics.integratedRoasExpected}
              />

              <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-5 lg:p-7">
                <PlannerReportDocument payload={payload} />
              </div>

              <div className={cn(plannerNeon.kpiCard, "mx-auto max-w-md text-center")}>
                <p className={plannerNeon.kpiLabel}>
                  {props.isKo ? "통합 ROAS (기대)" : "Integrated ROAS (expected)"}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-400">
                  {props.metrics.integratedRoasExpected}
                  {props.isKo ? "배" : "×"}
                </p>
              </div>

              <PlannerEffectSimulationPanel
                isKo={props.isKo}
                portfolio={props.portfolio}
                budgetMan={props.budgetNum}
                months={props.months}
                totalImpressionsFromMetrics={props.metrics.oohImpressions}
                skipProGate
              />
            </div>
          </PlannerProGate>

          <PlannerNeonCard>
            <div className="flex flex-col gap-4 border-b border-gray-100 p-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <PlannerNeonLabel>{t("reportEyebrow")}</PlannerNeonLabel>
                <h3 className={cn("mt-2 text-lg", plannerNeon.headline)}>
                  {tPlanner("reportPdfDocumentTitle")}
                </h3>
                <p className={cn("mt-1", plannerNeon.subtext)}>
                  {tPlanner("reportPreviewDesc")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {pdfAccessLoading ? (
                  <div className="h-10 w-32 animate-pulse rounded-xl bg-gray-200 dark:bg-white/10" />
                ) : pdfAllowed ? (
                  <>
                    <BtnBlock
                      variant="accent"
                      size="md"
                      onClick={() => void handleDownload("pdf")}
                      disabled={downloading !== null}
                    >
                      {downloading === "pdf" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {t("downloadPdf")}
                    </BtnBlock>
                    <BtnBlock
                      variant="secondary"
                      size="md"
                      onClick={() => void handleDownload("pptx")}
                      disabled={downloading !== null}
                    >
                      {downloading === "pptx" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {props.isKo ? "PPT 내려받기" : "Download PPT"}
                    </BtnBlock>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <BtnBlock variant="secondary" size="md" disabled>
                      <Lock className="h-4 w-4" />
                      {props.isKo ? "PDF — PRO 전용" : "PDF — PRO only"}
                    </BtnBlock>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      {props.isKo ? "PRO 14일 무료 체험 →" : "Start PRO trial →"}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </PlannerNeonCard>
        </section>
    </div>
  );
}
