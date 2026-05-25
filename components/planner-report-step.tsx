"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useTranslations } from "next-intl";
import { Camera, FileDown, Loader2, Lock, Mail, RefreshCw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  plannerBlendCpmKrw,
  portfolioDailyByCategory,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import {
  captureElementAsPng,
  defaultPlannerPdfFilename,
  downloadPdfFromHtmlElement,
  htmlElementToPdf,
  HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
} from "@/lib/html-to-pdf";
import { CONTACT_EMAIL } from "@/lib/constants";
import { useToast } from "@/components/toast-provider";
import PlannerReportPreview from "@/components/planner-report-preview";
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

function isPdfTimeoutError(e: unknown): boolean {
  return e instanceof Error && /timed out/i.test(e.message);
}

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
  /** Step 7과 동일: 유형별 예상 CPM (필터 결과 기반) */
  cpmBars: { key: string; label: string; value: number }[];
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
      label: props.isKo ? s.labelKo : s.labelEn,
      pct: s.pct,
      valueWon: s.value,
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
      cpmBars: props.cpmBars,
      effectSummaryLines,
      contact,
    }),
    [
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      dailyBars,
      props.cpmBars,
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const urlRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );
  const [userEmail, setUserEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const el = previewRef.current;
      if (!el) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const doc = await htmlElementToPdf(el, {
          timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
        });
        if (cancelled) return;
        const blob = doc.output("blob");
        const nextUrl = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = nextUrl;
      } catch (e) {
        console.error("[planner-pdf html2canvas]", e);
        if (!cancelled) {
          const timedOut = isPdfTimeoutError(e);
          setError(timedOut ? t("reportPdfTimeout") : t("reportPdfError"));
          toast(
            "error",
            timedOut ? t("reportPdfTimeout") : tCommon("pdfGenerationFailed"),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.months,
    props.regionsText,
    props.categoriesText,
    props.ageText,
    props.industryText,
    props.portfolio,
    props.metrics,
    props.reachCorePct,
    props.reachExtendedPct,
    derived,
    retryKey,
    snapshotAt,
    t,
    tCommon,
    toast,
  ]);

  const downloadPdf = useCallback(() => {
    const asciiName = defaultPlannerPdfFilename();
    const liveBlobUrl = urlRef.current;

    /** 미리보기와 동일 Blob — `urlRef`가 진실( effect 정리로 state `pdfUrl`이 revoke URL을 가질 수 있음) */
    if (liveBlobUrl && !loading && !error) {
      setDownloading(true);
      try {
        const a = document.createElement("a");
        a.href = liveBlobUrl;
        a.download = asciiName;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast("success", t("reportPdfDownloaded"));
      } catch (e) {
        console.error("[planner-pdf download from preview blob]", e);
        setError(t("reportPdfError"));
        toast("error", tCommon("pdfGenerationFailed"));
      } finally {
        setDownloading(false);
      }
      return;
    }

    void (async () => {
      setDownloading(true);
      try {
        await new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        const el = previewRef.current;
        if (!el) {
          toast("error", tCommon("pdfGenerationFailed"));
          return;
        }
        await downloadPdfFromHtmlElement(el, asciiName, {
          timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
        });
        const { trackGaEvent } = await import("@/lib/ga-events");
        trackGaEvent("pdf_download", { source: "planner_report" });
        toast("success", t("reportPdfDownloaded"));
      } catch (e) {
        console.error("[planner-pdf download regenerate]", e);
        const timedOut = isPdfTimeoutError(e);
        setError(timedOut ? t("reportPdfTimeout") : t("reportPdfError"));
        toast(
          "error",
          timedOut ? t("reportPdfTimeout") : tCommon("pdfGenerationFailed"),
        );
      } finally {
        setDownloading(false);
      }
    })();
  }, [
    loading,
    error,
    t,
    tCommon,
    toast,
  ]);

  const captureReportPng = useCallback(async () => {
    const el =
      document.getElementById("planner-report-content") ?? previewRef.current;
    if (!el) {
      toast("error", tCommon("pdfGenerationFailed"));
      return;
    }
    setCapturing(true);
    try {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const name = props.isKo
        ? `싱커드_플래너보고서_${ymd}.png`
        : `THINKAD_planner_${ymd}.png`;
      await captureElementAsPng(el, name);
      toast("success", t("reportImageSaved"));
    } catch (e) {
      console.error("[planner-capture]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setCapturing(false);
    }
  }, [props.isKo, t, tCommon, toast]);

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
      let screenshotBase64 = "";
      try {
        const reportEl =
          document.getElementById("planner-report-content") ?? previewRef.current;
        if (reportEl) {
          const canvas = await html2canvas(reportEl, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          screenshotBase64 = canvas.toDataURL("image/png");
        }
      } catch (e) {
        console.error("[planner-email] screenshot failed", e);
      }

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
          screenshot: screenshotBase64,
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

              <div
                className={cn(
                  "mx-auto flex w-full justify-center rounded-2xl border p-4 sm:p-6 lg:p-8",
                  "dark:border-white/10 border-gray-200 dark:bg-white/[0.03] bg-gray-100",
                )}
              >
                <PlannerReportPreview
                  ref={previewRef}
                  isKo={props.isKo}
                  goalTitle={props.goalTitle}
                  budgetNum={props.budgetNum}
                  periodDisplay={derived.periodDisplay}
                  regionsText={props.regionsText}
                  categoriesText={props.categoriesText}
                  ageText={props.ageText}
                  industryText={props.industryText}
                  portfolio={props.portfolio}
                  metrics={props.metrics}
                  reachCorePct={props.reachCorePct}
                  reachExtendedPct={props.reachExtendedPct}
                  budgetAllocation={derived.budgetAllocation}
                  blendedCpmKrw={derived.blendedCpmKrw}
                  effectSummaryLines={derived.effectSummaryLines}
                  generatedAt={snapshotAt}
                  logoUrl={props.logoUrl}
                  mediaPlacements={props.mediaPlacements}
                />
              </div>

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
                variant="metrics-only"
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
                variant="budget-only"
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
                      onAllowedDownload={downloadPdf}
                    >
                      {({ onDownloadClick, pdfAllowed, checking }) => (
                        <BtnBlock
                          variant="secondary"
                          size="md"
                          onClick={onDownloadClick}
                          disabled={loading || downloading || capturing || checking}
                        >
                          {downloading ? (
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
                    <BtnBlock
                      variant="secondary"
                      size="md"
                      onClick={() => void captureReportPng()}
                      disabled={loading || capturing || downloading}
                    >
                      {capturing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {t("reportCapturePng")}
                    </BtnBlock>
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
                        onClick={() => {
                          setError(null);
                          setRetryKey((k) => k + 1);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("reportRetryPdf")}
                      </BtnBlock>
                    ) : null}
                  </div>
                </div>
                {loading ? (
                  <div
                    className={cn(
                      "flex min-h-[8rem] items-center justify-center gap-3 py-8 text-sm",
                      plannerNeon.subtext,
                    )}
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    {t("reportGenerating")}
                  </div>
                ) : error ? (
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
  const [downloading, setDownloading] = useState(false);
  const compactPreviewRef = useRef<HTMLDivElement>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );

  const downloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const el = compactPreviewRef.current;
      if (!el) {
        toast("error", tCommon("pdfGenerationFailed"));
        return;
      }
      await downloadPdfFromHtmlElement(el, defaultPlannerPdfFilename(), {
        timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
      });
      const { trackGaEvent } = await import("@/lib/ga-events");
      trackGaEvent("pdf_download", { source: "planner_report_compact" });
      toast("success", t("reportPdfDownloaded"));
    } catch (e) {
      console.error("[planner-pdf compact]", e);
      toast(
        "error",
        isPdfTimeoutError(e) ? t("reportPdfTimeout") : tCommon("pdfGenerationFailed"),
      );
    } finally {
      setDownloading(false);
    }
  }, [t, tCommon, toast]);

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
      <div className="sr-only" aria-hidden>
        <div ref={compactPreviewRef} id="planner-report-content">
          <PlannerReportPreview
            isKo={props.isKo}
            goalTitle={props.goalTitle}
            budgetNum={props.budgetNum}
            periodDisplay={derived.periodDisplay}
            regionsText={props.regionsText}
            categoriesText={props.categoriesText}
            ageText={props.ageText}
            industryText={props.industryText}
            portfolio={props.portfolio}
            metrics={props.metrics}
            reachCorePct={props.reachCorePct}
            reachExtendedPct={props.reachExtendedPct}
            budgetAllocation={derived.budgetAllocation}
            blendedCpmKrw={derived.blendedCpmKrw}
            effectSummaryLines={derived.effectSummaryLines}
            generatedAt={snapshotAt}
            logoUrl={props.logoUrl}
            mediaPlacements={props.mediaPlacements}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-5 sm:p-6">
        <PlannerPdfDownloadGate
          isKo={props.isKo}
          onAllowedDownload={() => void downloadPdf()}
        >
          {({ onDownloadClick, pdfAllowed, checking }) => (
            <BtnBlock
              variant="accent"
              size="md"
              onClick={onDownloadClick}
              disabled={downloading || checking}
            >
              {downloading ? (
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
      </div>
    </PlannerNeonCard>
  );
}
