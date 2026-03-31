"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useTranslations } from "next-intl";
import { ExternalLink, FileDown, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  plannerBlendCpmKrw,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import {
  defaultPlannerPdfFilename,
  downloadPdfFromHtmlElement,
  htmlElementToPdf,
  HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
} from "@/lib/html-to-pdf";

function isPdfTimeoutError(e: unknown): boolean {
  return e instanceof Error && /timed out/i.test(e.message);
}
import { useToast } from "@/components/toast-provider";
import PlannerReportPreview from "@/components/planner-report-preview";

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
  metrics: PlannerMetrics | null;
  reachCorePct: number;
  reachExtendedPct: number;
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
      email: t("reportContactEmail"),
      address: t("reportContactAddress"),
    }),
    [t],
  );

  return useMemo(
    () => ({
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      effectSummaryLines,
      contact,
    }),
    [
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
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

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
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
        setPdfUrl(nextUrl);
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

    /** 미리보기와 동일 Blob — 사용자 제스처 안에서 동기 다운로드(비동기 재생성 후 클릭 시 차단 방지) */
    if (pdfUrl && !loading && !error) {
      setDownloading(true);
      try {
        const a = document.createElement("a");
        a.href = pdfUrl;
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
    pdfUrl,
    loading,
    error,
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.regionsText,
    props.categoriesText,
    props.ageText,
    props.industryText,
    props.portfolio,
    props.metrics,
    props.reachCorePct,
    props.reachExtendedPct,
    derived,
    t,
    tCommon,
    toast,
  ]);
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
            name: props.isKo ? m.name : m.nameEn,
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
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-lg font-bold text-navy sm:text-xl">
          {t("stepReportTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("stepReportDesc")}</p>
      </div>

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
      />

      <Card className="border-navy/10 shadow-lg">
        <CardHeader className="flex flex-col gap-4 border-b border-navy/8 bg-slate-50/50 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-navy">{t("reportPdfDocumentTitle")}</CardTitle>
            <CardDescription>{t("reportPreviewDesc")}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-navy/20"
              onClick={downloadPdf}
              disabled={loading || downloading}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              {t("reportDownloadPdf")}
            </Button>
            {pdfUrl && !loading ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-navy/20"
                asChild
              >
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("reportOpenPdfNewTab")}
                </a>
              </Button>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="email"
                placeholder={props.isKo ? "이메일 주소" : "Email address"}
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setEmailSent(false);
                }}
                className="h-10 w-full min-w-[14rem] sm:w-56"
              />
              <Button
                type="button"
                className="btn-gold rounded-full font-semibold"
                onClick={() => void sendEmailReport()}
                disabled={emailSending}
              >
                {emailSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                {emailSent ? t("reportEmailSent") : t("reportEmailMe")}
              </Button>
            </div>
            {error ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  setError(null);
                  setRetryKey((k) => k + 1);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("reportRetryPdf")}
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy/15 bg-slate-50/60 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              {t("reportGenerating")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-10 text-center text-sm text-destructive">
              <p>{error}</p>
              <p className="mt-2 text-xs text-destructive/80">
                {t("reportPdfErrorHint")}
              </p>
            </div>
          ) : pdfUrl ? (
            <iframe
              title={t("reportPdfDocumentTitle")}
              src={`${pdfUrl}#toolbar=1`}
              className="h-[min(65vh,720px)] w-full rounded-2xl border border-navy/10 bg-white shadow-inner"
            />
          ) : null}
        </CardContent>
      </Card>
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
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.regionsText,
    props.categoriesText,
    props.ageText,
    props.industryText,
    props.portfolio,
    props.metrics,
    props.reachCorePct,
    props.reachExtendedPct,
    derived,
    t,
    tCommon,
    toast,
  ]);
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
            name: props.isKo ? m.name : m.nameEn,
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
    <Card className="border-navy/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-navy">{t("reportPreviewTitle")}</CardTitle>
        <CardDescription>{t("reportCompactDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <PlannerReportPreview
          ref={compactPreviewRef}
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
        />
        <div className="flex flex-wrap gap-2 border-t border-navy/10 pt-6">
          <Button
            type="button"
            className="btn-gold rounded-full font-semibold"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {t("reportDownloadPdf")}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder={props.isKo ? "이메일 주소" : "Email address"}
              value={userEmail}
              onChange={(e) => {
                setUserEmail(e.target.value);
                setEmailSent(false);
              }}
              className="h-10 w-full min-w-[12rem] sm:w-52"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-navy/20"
              onClick={() => void sendEmailReport()}
              disabled={emailSending}
            >
              {emailSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {emailSent ? t("reportEmailSent") : t("reportEmailMe")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
