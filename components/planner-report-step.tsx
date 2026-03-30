"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Mail } from "lucide-react";
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
import type { PlannerCampaignGoal, PlannerMetrics } from "@/lib/planner-logic";
import {
  buildPlannerReportPdf,
  type PlannerReportPdfLabels,
} from "@/lib/build-planner-report-pdf";

type Props = {
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
  creativeObjectUrl: string | null;
};

async function blobUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(String(r.result));
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function mediaPhotoUrl(m: MediaItem): string | null {
  return getPrimaryMediaImageUrl(m) ?? resolveMediaGallery(m)[0] ?? null;
}

export default function PlannerReportStep({
  isKo,
  campaignGoal,
  goalTitle,
  budgetNum,
  months,
  regionsText,
  categoriesText,
  ageText,
  industryText,
  portfolio,
  metrics,
  reachCorePct,
  reachExtendedPct,
  creativeObjectUrl,
}: Props) {
  const t = useTranslations("planner");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const labels: PlannerReportPdfLabels = useMemo(
    () => ({
      title: t("reportPdfTitle"),
      sectionOverview: t("reportSectionOverview"),
      sectionMedia: t("reportSectionMedia"),
      sectionSimulation: t("reportSectionSimulation"),
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
      simCreativeNote: t("reportSimCreativeNote"),
      simNoCreative: t("reportSimNoCreative"),
      footerDisclaimer: t("reportFooterDisclaimer"),
    }),
    [t],
  );

  const contact = useMemo(
    () => ({
      company: t("reportContactCompany"),
      phone: t("reportContactPhone"),
      email: t("reportContactEmail"),
      address: t("reportContactAddress"),
    }),
    [t],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const creativeDataUrl = creativeObjectUrl
        ? await blobUrlToDataUrl(creativeObjectUrl)
        : null;
      const generatedAt = new Date().toLocaleString(isKo ? "ko-KR" : "en-US");
      const pdfPortfolio = portfolio.map((m) => ({
        name: isKo ? m.name : m.nameEn || m.name,
        location: isKo ? m.location : m.locationEn || m.location,
        price: m.price,
        size: m.size ?? "—",
        resolution: m.resolution ?? "—",
        type: m.type,
        dailyFootTraffic: m.dailyFootTraffic,
        imageUrl: mediaPhotoUrl(m),
      }));
      try {
        const doc = await buildPlannerReportPdf({
          labels,
          generatedAt,
          goalText: goalTitle,
          budgetMan: budgetNum,
          months,
          regionsText,
          categoriesText,
          ageText,
          industryText,
          isKo,
          portfolio: pdfPortfolio,
          metrics: metrics
            ? {
                monthlyImp: metrics.estimatedMonthlyImpressions,
                totalImp: metrics.estimatedTotalImpressions,
                roiExpected: metrics.roiExpected,
                reachCorePct,
                reachExtendedPct,
              }
            : null,
          creativeDataUrl,
          contact,
        });
        if (cancelled) return;
        const blob = doc.output("blob");
        const nextUrl = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = nextUrl;
        setPdfUrl(nextUrl);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t("reportPdfError"));
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
    labels,
    isKo,
    goalTitle,
    budgetNum,
    months,
    regionsText,
    categoriesText,
    ageText,
    industryText,
    portfolio,
    metrics,
    reachCorePct,
    reachExtendedPct,
    creativeObjectUrl,
    contact,
    t,
  ]);

  const downloadPdf = useCallback(async () => {
    try {
      const creativeDataUrl = creativeObjectUrl
        ? await blobUrlToDataUrl(creativeObjectUrl)
        : null;
      const generatedAt = new Date().toLocaleString(isKo ? "ko-KR" : "en-US");
      const pdfPortfolio = portfolio.map((m) => ({
        name: isKo ? m.name : m.nameEn || m.name,
        location: isKo ? m.location : m.locationEn || m.location,
        price: m.price,
        size: m.size ?? "—",
        resolution: m.resolution ?? "—",
        type: m.type,
        dailyFootTraffic: m.dailyFootTraffic,
        imageUrl: mediaPhotoUrl(m),
      }));
      const doc = await buildPlannerReportPdf({
        labels,
        generatedAt,
        goalText: goalTitle,
        budgetMan: budgetNum,
        months,
        regionsText,
        categoriesText,
        ageText,
        industryText,
        isKo,
        portfolio: pdfPortfolio,
        metrics: metrics
          ? {
              monthlyImp: metrics.estimatedMonthlyImpressions,
              totalImp: metrics.estimatedTotalImpressions,
              roiExpected: metrics.roiExpected,
              reachCorePct,
              reachExtendedPct,
            }
          : null,
        creativeDataUrl,
        contact,
      });
      doc.save(
        isKo
          ? `THINKAD-플래너-보고서-${Date.now()}.pdf`
          : `THINKAD-planner-report-${Date.now()}.pdf`,
      );
    } catch (e) {
      console.error(e);
      setError(t("reportPdfError"));
    }
  }, [
    labels,
    isKo,
    goalTitle,
    budgetNum,
    months,
    regionsText,
    categoriesText,
    ageText,
    industryText,
    portfolio,
    metrics,
    reachCorePct,
    reachExtendedPct,
    creativeObjectUrl,
    contact,
    t,
  ]);

  const emailReport = useCallback(() => {
    const subject = encodeURIComponent(
      isKo ? "[THINKAD] 플래너 보고서 요청" : "[THINKAD] Planner report request",
    );
    const body = encodeURIComponent(
      [
        isKo ? "플래너 보고서를 이메일로 받고 싶습니다." : "Please send the planner report by email.",
        "",
        `${isKo ? "목표" : "Goal"}: ${goalTitle}`,
        `${isKo ? "예산(만원)" : "Budget (₩10K)"}: ${budgetNum}`,
        `${isKo ? "기간" : "Duration"}: ${months}${isKo ? "개월" : " mo"}`,
        campaignGoal ? `goalKey: ${campaignGoal}` : "",
        "",
        `${isKo ? "연락 가능한 이메일" : "Reply email"}: `,
      ].join("\n"),
    );
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  }, [isKo, goalTitle, budgetNum, months, campaignGoal, contact.email]);

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-lg font-bold text-navy sm:text-xl">
          {t("stepReportTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("stepReportDesc")}</p>
      </div>

      <Card className="border-navy/10 shadow-lg">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-navy">{t("reportPreviewTitle")}</CardTitle>
            <CardDescription>{t("reportPreviewDesc")}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-navy/20"
              onClick={downloadPdf}
              disabled={loading || !!error}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t("reportDownloadPdf")}
            </Button>
            <Button
              type="button"
              className="btn-gold rounded-full font-semibold"
              onClick={emailReport}
            >
              <Mail className="mr-2 h-4 w-4" />
              {t("reportEmailMe")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[28rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-navy/15 bg-slate-50/60 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-gold" />
              {t("reportGenerating")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-10 text-center text-sm text-destructive">
              {error}
            </div>
          ) : pdfUrl ? (
            <iframe
              title={t("reportPreviewTitle")}
              src={`${pdfUrl}#toolbar=1`}
              className="h-[min(72vh,820px)] w-full rounded-2xl border border-navy/10 bg-white shadow-inner"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
