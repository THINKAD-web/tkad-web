"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Lock, Mail, RefreshCw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  plannerBlendCpmKrw,
  portfolioCpmByCategory,
  portfolioDailyByCategory,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import { downloadPlannerReport } from "@/lib/planner-report-export/client";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type { PlannerReportExportFormat } from "@/lib/planner-report-export/types";
import { CONTACT_EMAIL } from "@/lib/constants";
import { useToast } from "@/components/toast-provider";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { PlannerReportDocument } from "@/components/planner/report-document";
import { PlannerEffectSimulationPanel } from "@/components/planner-effect-simulation-panel";
import { PlannerReportPremiumBlock } from "@/components/planner/planner-report-premium-block";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  PlannerProGate,
  PlannerProTeaserStats,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { PlannerReportInfoCard } from "@/components/planner/planner-report-info-card";
import { PlannerReportFreeSummary } from "@/components/planner/planner-report-free-summary";
import { useIsPro } from "@/hooks/use-is-pro";
import { cn } from "@/lib/utils";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";

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
  portfolio: MediaItem[];
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
};

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

  const budgetAllocation = useMemo(() => {
    const slices = budgetSplitByCategory(props.portfolio);
    return slices.map((s) => ({
      key: s.key,
      label: props.isKo ? s.labelKo : s.labelEn,
      pct: s.pct,
      valueWon: s.value,
      actualWon: s.actualWon,
    }));
  }, [props.portfolio, props.isKo]);

  const cpmBars = useMemo(() => {
    const pts = portfolioCpmByCategory(props.portfolio);
    return pts.map((p) => ({
      key: p.key,
      label: props.isKo ? p.labelKo : p.labelEn,
      value: p.cpm,
    }));
  }, [props.portfolio, props.isKo]);

  const blendedCpmKrw = useMemo(() => {
    if (!props.metrics) return null;
    return plannerBlendCpmKrw(
      props.portfolio,
      props.metrics.estimatedMonthlyImpressions,
    );
  }, [props.metrics, props.portfolio]);

  const dailyBars = useMemo(() => {
    const pts = portfolioDailyByCategory(props.portfolio);
    return pts.map((p) => ({
      key: p.key,
      label: props.isKo ? p.labelKo : p.labelEn,
      value: p.daily,
    }));
  }, [props.portfolio, props.isKo]);

  const effectSummaryLines = useMemo(() => {
    if (!props.metrics) return [];
    const lines: string[] = [
      t("reportSummaryImpMonthly", {
        n: props.metrics.estimatedMonthlyImpressions.toLocaleString(),
      }),
      t("reportSummaryImpTotal", {
        n: props.metrics.estimatedTotalImpressions.toLocaleString(),
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
    lines.push(
      t("reportSummaryRoi", { n: props.metrics.roiExpected }),
      t("reportSummaryDisclaimerShort"),
    );
    return lines;
  }, [props.metrics, props.reachCorePct, props.reachExtendedPct, blendedCpmKrw, t]);

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
  const { isPro, loading: proLoading } = useIsPro();
  const derived = usePlannerReportDerived(props);

  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] =
    useState<PlannerReportExportFormat | null>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );
  const [userEmail, setUserEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
        portfolio: props.portfolio,
        metrics: props.metrics,
        reachCorePct: props.reachCorePct,
        reachExtendedPct: props.reachExtendedPct,
        blendedCpmKrw: derived.blendedCpmKrw,
        budgetAllocation: derived.budgetAllocation,
        cpmBars: derived.cpmBars,
        effectSummaryLines: derived.effectSummaryLines,
        generatedAt: snapshotAt,
        months: props.months,
      }),
    [props, derived, snapshotAt],
  );

  const handleExport = useCallback(
    async (format: PlannerReportExportFormat) => {
      if (downloading) return;
      setDownloading(format);
      setError(null);
      try {
        await downloadPlannerReport(format, payload);
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
    [downloading, payload, t, tCommon, toast],
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
          metrics: props.metrics,
          screenshot: "",
        }),
      });
      if (!res.ok) {
        throw new Error("email failed");
      }
      setEmailSent(true);
      toast(
        "success",
        props.isKo
          ? "이메일로 보고서가 발송되었습니다"
          : "Report has been sent by email",
      );
    } catch {
      toast(
        "error",
        props.isKo
          ? "이메일 발송에 실패했습니다"
          : "Failed to send email report",
      );
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

      <PlannerReportFreeSummary
        isKo={props.isKo}
        goalTitle={props.goalTitle}
        budgetNum={props.budgetNum}
        periodDisplay={derived.periodDisplay}
        regionsText={props.regionsText}
        categoriesText={props.categoriesText}
        ageText={props.ageText}
        industryText={props.industryText}
        portfolio={props.portfolio}
      />

      {/* PRO 블러 — 미리보기·노출·시뮬·PDF 통합 */}
      {!proLoading ? (
        <section className="space-y-3" data-screenshot="planner-pro-blur">
          <PlannerProGate isPro={isPro} isKo={props.isKo} minHeightClass="min-h-[24rem]">
            <div className="space-y-6">
              {props.metrics ? (
                <PlannerProTeaserStats
                  isKo={props.isKo}
                  totalImpressions={props.metrics.estimatedTotalImpressions}
                  reachCorePct={props.reachCorePct}
                  roiExpected={props.metrics.roiExpected}
                />
              ) : null}

              <DocumentPreviewFrame>
                <PlannerReportDocument payload={payload} />
              </DocumentPreviewFrame>

              {props.metrics ? (
                <div className={cn(plannerNeon.kpiCard, "mx-auto max-w-md text-center")}>
                  <p className={plannerNeon.kpiLabel}>
                    {props.isKo ? "총 예상 노출수 (대략)" : "Est. total impressions (approx.)"}
                  </p>
                  <p className={cn("mt-2 text-3xl font-bold tabular-nums text-cyan-400")}>
                    {props.metrics.estimatedTotalImpressions.toLocaleString()}
                  </p>
                </div>
              ) : null}

              <PlannerReportPremiumBlock
                isKo={props.isKo}
                portfolio={props.portfolio}
                budgetMan={props.budgetNum}
                months={props.months}
                regionsText={props.regionsText}
                goal={props.campaignGoal}
                industryText={props.industryText}
              />
              <PlannerEffectSimulationPanel
                isKo={props.isKo}
                portfolio={props.portfolio}
                budgetMan={props.budgetNum}
                months={props.months}
                totalImpressionsFromMetrics={
                  props.metrics?.estimatedTotalImpressions ?? null
                }
                skipProGate
              />

              <PlannerNeonCard>
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
                        }}
                        className={cn(
                          "h-10 w-full min-w-[14rem] rounded-xl border px-3 text-sm",
                          "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                          "dark:text-white text-gray-900 placeholder:dark:text-white/40 placeholder:text-gray-400",
                          "focus:border-violet-400/60 focus:outline-none sm:w-56",
                        )}
                      />
                      <BtnBlock
                        variant="accent"
                        size="md"
                        onClick={() => void sendEmailReport()}
                        disabled={emailSending}
                      >
                        {emailSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        {emailSent ? t("reportEmailSent") : t("reportEmailMe")}
                      </BtnBlock>
                    </div>
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
          </PlannerProGate>
        </section>
      ) : null}
    </div>
  );
}

/** 대시보드(7단계) 하단: PDF 다운로드만 (상세 보고서는 6단계 통합) */
export function PlannerReportPdfCompact(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const { loading: proLoading } = useIsPro();
  const derived = usePlannerReportDerived(props);
  const [downloading, setDownloading] =
    useState<PlannerReportExportFormat | null>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
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
          portfolio: props.portfolio,
          metrics: props.metrics,
          reachCorePct: props.reachCorePct,
          reachExtendedPct: props.reachExtendedPct,
          blendedCpmKrw: derived.blendedCpmKrw,
          budgetAllocation: derived.budgetAllocation,
          cpmBars: derived.cpmBars,
          effectSummaryLines: derived.effectSummaryLines,
          generatedAt: snapshotAt,
          months: props.months,
        });
        await downloadPlannerReport(format, payload);
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
    [downloading, props, derived, snapshotAt, t, tCommon, toast],
  );

  if (proLoading) return null;

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
