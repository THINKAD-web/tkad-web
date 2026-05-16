"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useTranslations } from "next-intl";
import { Camera, FileDown, Loader2, Mail, RefreshCw } from "lucide-react";
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
import {
  PlannerImpressionsLineChart,
  PlannerRoiLineChart,
  PlannerDailyReachBarChart,
  PlannerCpmCompareChart,
  PlannerMonthCompareChart,
} from "@/components/planner-charts";

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
      valueMan: s.value,
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
    <div className="mx-auto w-full max-w-7xl space-y-8">
      <div className="space-y-2 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ STEP 6 / REPORT ]
        </p>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t("stepReportTitle")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("stepReportDesc")}
        </p>
      </div>

      <div className="mx-auto flex w-full justify-center border-2 border-border bg-muted p-4 sm:p-6 lg:p-8">
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

      <div className="border-2 border-border bg-card">
        <div className="flex flex-col gap-4 border-b-2 border-border p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ PDF DOCUMENT ]
            </p>
            <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
              {t("reportPdfDocumentTitle")}
            </h3>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {t("reportPreviewDesc")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={downloadPdf}
              disabled={loading || downloading || capturing}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {t("reportDownloadPdf")}
            </BtnBlock>
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
                className="h-10 w-full min-w-[14rem] border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-56"
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
          <div className="flex min-h-[8rem] items-center justify-center gap-3 bg-muted py-8 font-mono text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {`// `}{t("reportGenerating")}
          </div>
        ) : error ? (
          <div className="px-5 py-6">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              [ ERROR ]
            </p>
            <p className="mt-2 font-bold text-foreground">{error}</p>
            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
              {t("reportPdfErrorHint")}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 대시보드(7단계) 하단: 요약 미리보기 + PDF 다운로드(클릭 시 생성) */
export function PlannerReportPdfCompact(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const derived = usePlannerReportDerived(props);
  const [downloading, setDownloading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const compactPreviewRef = useRef<HTMLDivElement>(null);
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );
  const [userEmail, setUserEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
  }, [
    t,
    tCommon,
    toast,
  ]);

  const captureReportPngCompact = useCallback(async () => {
    const el =
      document.getElementById("planner-report-content") ?? compactPreviewRef.current;
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
      console.error("[planner-capture compact]", e);
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
          document.getElementById("planner-report-content") ??
          compactPreviewRef.current;
        if (reportEl) {
          const canvas = await html2canvas(reportEl, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          screenshotBase64 = canvas.toDataURL("image/png");
        }
      } catch (e) {
        console.error("[planner-email] compact screenshot failed", e);
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
    <div className="border-2 border-border bg-card">
      <div className="border-b-2 border-border p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ REPORT PREVIEW ]
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
          {t("reportPreviewTitle")}
        </h3>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
          {t("reportCompactDesc")}
        </p>
      </div>
      <div className="space-y-6 p-5">
        <div className="flex justify-center border-2 border-border bg-muted p-3 sm:p-5">
          {/* PDF: 보고서 + 효과측정 스냅샷을 한 번에 캡처 */}
          <div ref={compactPreviewRef} className="w-full max-w-[240mm] space-y-6">
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

            {props.metrics ? (
              <div className="border-2 border-bx-black bg-bx-white">
                <div className="border-b-2 border-bx-black p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ EFFECT DASHBOARD SNAPSHOT ]
                  </p>
                  <p className="mt-2 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                    {`// `}
                    {props.isKo
                      ? "보고서(플랜) + 효과측정(시뮬레이션) 내용을 한 번에 출력합니다."
                      : "Print the plan report + simulation dashboard in one PDF."}
                  </p>
                </div>

                <div className="space-y-6 p-5">
                  {(() => {
                    const budgetKrw = props.budgetNum * 10_000;
                    const estReach = Math.round(
                      props.metrics!.estimatedTotalImpressions * 0.75,
                    );
                    const estCpm =
                      props.metrics!.estimatedTotalImpressions > 0
                        ? Math.round(
                            (budgetKrw /
                              props.metrics!.estimatedTotalImpressions) *
                              1000,
                          )
                        : 0;
                    return (
                      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                            [ {t("kpiImpressions")} ]
                          </p>
                          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-accent">
                            {props.metrics!.estimatedTotalImpressions.toLocaleString()}
                          </p>
                          <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                            {t("kpiImpressionsHint")}
                          </p>
                        </div>
                        <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                            [ {t("kpiReach")} ]
                          </p>
                          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                            {estReach.toLocaleString()}
                          </p>
                          <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                            {t("kpiReachHint")}
                          </p>
                        </div>
                        <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                            [ {t("kpiCpm")} ]
                          </p>
                          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                            ₩{estCpm.toLocaleString()}
                          </p>
                          <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-gray-dim">
                            {t("kpiCpmHint")}
                          </p>
                        </div>
                        <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-black p-4 text-bx-white">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                            [ {t("kpiRoi")} ]
                          </p>
                          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-accent">
                            {props.metrics!.roiExpected}
                            {t("roiUnit")}
                          </p>
                          <p className="mt-1 font-mono text-[10px] tracking-tight text-bx-white/65">
                            {t("kpiRoiHint")}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="border-2 border-bx-black bg-bx-white">
                    <div className="border-b-2 border-bx-black p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("chartDailyBarTitle")} ]
                      </p>
                    </div>
                    <div className="p-5">
                      <PlannerDailyReachBarChart
                        data={derived.dailyBars}
                        title={t("chartDailyBarTitle")}
                        valueLabel={t("chartDailyBarAxis")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-2">
                    <div className="border-2 border-bx-black bg-bx-white">
                      <div className="border-b-2 border-bx-black p-5">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                          [ {t("chartCpmTitle")} ]
                        </p>
                      </div>
                      <div className="p-5">
                        <PlannerCpmCompareChart
                          data={props.cpmBars}
                          title={t("chartCpmTitle")}
                          unitLabel={t("chartCpmUnit")}
                        />
                      </div>
                    </div>
                    <div className="-ml-[2px] border-2 border-bx-black bg-bx-white">
                      <div className="border-b-2 border-bx-black p-5">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                          [ {t("chartMonthCompareTitle")} ]
                        </p>
                      </div>
                      <div className="p-5">
                        <PlannerMonthCompareChart
                          data={props.monthCompare.map((x) => ({
                            months: x.months,
                            total: x.totalImpressions,
                          }))}
                          title={t("chartMonthCompareTitle")}
                          barLabels={[
                            t("monthCompare1"),
                            t("monthCompare3"),
                            t("monthCompare6"),
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-bx-black bg-bx-white">
                    <div className="border-b-2 border-bx-black p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("chartImpLineTitle")} ]
                      </p>
                    </div>
                    <div className="p-5">
                      <PlannerImpressionsLineChart
                        data={props.metrics!.cumulativeByMonth}
                        isKo={props.isKo}
                        title={t("chartImpLineTitle")}
                      />
                    </div>
                  </div>

                  <div className="border-2 border-bx-black bg-bx-white">
                    <div className="border-b-2 border-bx-black p-5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ {t("chartRoiLineTitle")} ]
                      </p>
                      <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
                        {t("chartRoiLineHint")}
                      </p>
                    </div>
                    <div className="p-5">
                      <PlannerRoiLineChart
                        data={props.metrics!.roiByMonth}
                        isKo={props.isKo}
                        title={t("chartRoiLineTitle")}
                        hint={t("chartRoiLineHint")}
                        legendConservative={t("roiConservative")}
                        legendExpected={t("roiExpected")}
                        legendOptimistic={t("roiOptimistic")}
                        roiUnit={t("roiUnit")}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t-2 border-border pt-6">
          <BtnBlock
            variant="accent"
            size="md"
            onClick={() => void downloadPdf()}
            disabled={downloading || capturing}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {t("reportDownloadPdf")}
          </BtnBlock>
          <BtnBlock
            variant="secondary"
            size="md"
            onClick={() => void captureReportPngCompact()}
            disabled={downloading || capturing}
          >
            {capturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {t("reportCapturePng")}
          </BtnBlock>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder={props.isKo ? "이메일 주소" : "Email address"}
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value);
                setEmailSent(false);
              }}
              className="h-10 w-full min-w-[12rem] border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:w-52"
            />
            <BtnBlock
              variant="secondary"
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
        </div>
      </div>
    </div>
  );
}
