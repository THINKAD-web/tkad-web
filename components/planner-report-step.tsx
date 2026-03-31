"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink, FileDown, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  plannerBlendCpmKrw,
  type PlannerCampaignGoal,
  type PlannerMetrics,
} from "@/lib/planner-logic";
import { formatPlannerPeriodDisplay } from "@/lib/planner-period";
import {
  buildPlannerReportPdf,
  defaultPlannerPdfFilename,
  downloadPlannerPdf,
  plannerPdfToBlob,
  type PlannerReportPdfLabels,
} from "@/lib/build-planner-report-pdf";
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

function mediaPhotoUrl(m: MediaItem): string | null {
  return getPrimaryMediaImageUrl(m) ?? resolveMediaGallery(m)[0] ?? null;
}

function usePlannerReportDerived(props: PlannerReportSharedProps) {
  const t = useTranslations("planner");
  const labels: PlannerReportPdfLabels = useMemo(
    () => ({
      title: t("reportPdfTitle"),
      sectionOverview: t("reportSectionOverview"),
      sectionMedia: t("reportSectionMedia"),
      sectionEffect: t("reportSectionEffect"),
      sectionCost: t("reportSectionCost"),
      sectionContact: t("reportSectionContact"),
      labelGoal: t("reportLabelGoal"),
      labelBudget: t("reportLabelBudget"),
      labelPeriod: t("reportLabelPeriod"),
      labelRegions: t("reportLabelRegions"),
      labelCategories: t("reportLabelCategories"),
      labelAge: t("reportLabelAge"),
      labelIndustry: t("reportLabelIndustry"),
      labelLocation: t("reportLabelLocation"),
      labelPrice: t("reportLabelPrice"),
      labelSize: t("reportLabelSize"),
      labelResolution: t("reportLabelResolution"),
      labelType: t("reportLabelType"),
      labelDailyTraffic: t("reportLabelDailyTraffic"),
      labelMonthlyImp: t("reportLabelMonthlyImp"),
      labelTotalImp: t("reportLabelTotalImp"),
      labelRoiExpected: t("reportLabelRoiExpected"),
      labelReachCore: t("reportLabelReachCore"),
      labelReachExtended: t("reportLabelReachExtended"),
      labelCostBreakdown: t("reportLabelCostBreakdown"),
      labelShare: t("reportLabelShare"),
      labelCpm: t("reportLabelCpm"),
      sectionBudgetAllocation: t("reportSectionBudgetAllocation"),
      budgetAllocationIntro: t("reportBudgetAllocationIntro"),
      sectionEffectSummary: t("reportSectionEffectSummary"),
      effectSummaryIntro: t("reportEffectSummaryIntro"),
      reportSectionCompositeNote: t("reportSectionCompositeNote"),
      reportCompositeBody: t("reportCompositeBody"),
      footerDisclaimer: t("reportFooterDisclaimer"),
    }),
    [t],
  );

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
      labels,
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      effectSummaryLines,
      contact,
    }),
    [
      labels,
      periodDisplay,
      budgetAllocation,
      blendedCpmKrw,
      effectSummaryLines,
      contact,
    ],
  );
}

function buildPlannerPdfParams(
  props: PlannerReportSharedProps,
  derived: ReturnType<typeof usePlannerReportDerived>,
  generatedAt: string,
) {
  const pdfPortfolio = props.portfolio.map((m) => ({
    name: props.isKo ? m.name : m.nameEn || m.name,
    location: props.isKo ? m.location : m.locationEn || m.location,
    price: m.price,
    size: m.size ?? "—",
    resolution: m.resolution ?? "—",
    type: m.type,
    dailyFootTraffic: m.dailyFootTraffic ?? 0,
    imageUrl: mediaPhotoUrl(m),
  }));
  return {
    labels: derived.labels,
    generatedAt,
    goalText: props.goalTitle,
    budgetMan: props.budgetNum,
    periodDisplay: derived.periodDisplay,
    regionsText: props.regionsText,
    categoriesText: props.categoriesText,
    ageText: props.ageText,
    industryText: props.industryText,
    isKo: props.isKo,
    portfolio: pdfPortfolio,
    metrics: props.metrics
      ? {
          monthlyImp: props.metrics.estimatedMonthlyImpressions,
          totalImp: props.metrics.estimatedTotalImpressions,
          roiExpected: props.metrics.roiExpected,
          reachCorePct: props.reachCorePct,
          reachExtendedPct: props.reachExtendedPct,
        }
      : null,
    budgetAllocation: derived.budgetAllocation,
    blendedCpmKrw: derived.blendedCpmKrw,
    effectSummaryLines: derived.effectSummaryLines,
    contact: derived.contact,
  };
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
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const generatedAt = new Date().toLocaleString(
        props.isKo ? "ko-KR" : "en-US",
      );
      try {
        const doc = await buildPlannerReportPdf(
          buildPlannerPdfParams(props, derived, generatedAt),
        );
        if (cancelled) return;
        const blob = plannerPdfToBlob(doc);
        const nextUrl = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = nextUrl;
        setPdfUrl(nextUrl);
      } catch (e) {
        console.error("[planner-pdf]", e);
        if (!cancelled) {
          setError(t("reportPdfError"));
          toast("error", tCommon("pdfGenerationFailed"));
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
        const generatedAt = new Date().toLocaleString(
          props.isKo ? "ko-KR" : "en-US",
        );
        const doc = await buildPlannerReportPdf(
          buildPlannerPdfParams(props, derived, generatedAt),
        );
        downloadPlannerPdf(doc, asciiName);
        toast("success", t("reportPdfDownloaded"));
      } catch (e) {
        console.error("[planner-pdf download regenerate]", e);
        setError(t("reportPdfError"));
        toast("error", tCommon("pdfGenerationFailed"));
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

  const emailReport = useCallback(() => {
    const subject = encodeURIComponent(
      props.isKo
        ? "[THINKAD] 플래너 보고서 요청"
        : "[THINKAD] Planner report request",
    );
    const body = encodeURIComponent(
      [
        props.isKo
          ? "플래너 보고서를 이메일로 받고 싶습니다."
          : "Please send the planner report by email.",
        "",
        `${props.isKo ? "목표" : "Goal"}: ${props.goalTitle}`,
        `${props.isKo ? "예산(만원)" : "Budget (₩10K)"}: ${props.budgetNum}`,
        `${props.isKo ? "기간" : "Duration"}: ${derived.periodDisplay}`,
        props.campaignGoal ? `goalKey: ${props.campaignGoal}` : "",
        "",
        `${props.isKo ? "연락 가능한 이메일" : "Reply email"}: `,
      ].join("\n"),
    );
    window.location.href = `mailto:${derived.contact.email}?subject=${subject}&body=${body}`;
  }, [
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.campaignGoal,
    derived.periodDisplay,
    derived.contact.email,
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-navy/20"
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
            <Button
              type="button"
              className="btn-gold rounded-full font-semibold"
              onClick={emailReport}
            >
              <Mail className="mr-2 h-4 w-4" />
              {t("reportEmailMe")}
            </Button>
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
  const [snapshotAt] = useState(() =>
    new Date().toLocaleString(props.isKo ? "ko-KR" : "en-US"),
  );

  const downloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const generatedAt = new Date().toLocaleString(
        props.isKo ? "ko-KR" : "en-US",
      );
      const doc = await buildPlannerReportPdf(
        buildPlannerPdfParams(props, derived, generatedAt),
      );
      downloadPlannerPdf(doc, defaultPlannerPdfFilename());
      toast("success", t("reportPdfDownloaded"));
    } catch (e) {
      console.error("[planner-pdf compact]", e);
      toast("error", tCommon("pdfGenerationFailed"));
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

  const emailReport = useCallback(() => {
    const subject = encodeURIComponent(
      props.isKo
        ? "[THINKAD] 플래너 보고서 요청"
        : "[THINKAD] Planner report request",
    );
    const body = encodeURIComponent(
      [
        props.isKo
          ? "플래너 보고서를 이메일로 받고 싶습니다."
          : "Please send the planner report by email.",
        "",
        `${props.isKo ? "목표" : "Goal"}: ${props.goalTitle}`,
        `${props.isKo ? "예산(만원)" : "Budget (₩10K)"}: ${props.budgetNum}`,
        `${props.isKo ? "기간" : "Duration"}: ${derived.periodDisplay}`,
        props.campaignGoal ? `goalKey: ${props.campaignGoal}` : "",
        "",
        `${props.isKo ? "연락 가능한 이메일" : "Reply email"}: `,
      ].join("\n"),
    );
    window.location.href = `mailto:${derived.contact.email}?subject=${subject}&body=${body}`;
  }, [
    props.isKo,
    props.goalTitle,
    props.budgetNum,
    props.campaignGoal,
    derived.periodDisplay,
    derived.contact.email,
  ]);

  return (
    <Card className="border-navy/10 shadow-lg">
      <CardHeader>
        <CardTitle className="text-navy">{t("reportPreviewTitle")}</CardTitle>
        <CardDescription>{t("reportCompactDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
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
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-navy/20"
            onClick={emailReport}
          >
            <Mail className="mr-2 h-4 w-4" />
            {t("reportEmailMe")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
