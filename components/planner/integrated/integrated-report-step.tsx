"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";
import { useToast } from "@/components/toast-provider";
import { useIsPro } from "@/hooks/use-is-pro";
import IntegratedReportPreview from "@/components/planner/integrated/integrated-report-preview";
import { IntegratedReportInfoCard } from "@/components/planner/integrated/integrated-report-info-card";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  goalTitle: string;
  goal: PlannerCampaignGoal | null;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  portfolio: MediaItem[];
  digitalResult: DigitalRecommendResult;
  metrics: IntegratedCampaignMetrics;
};

export function IntegratedReportStep(props: Props) {
  const t = useTranslations("plannerIntegrated");
  const { toast } = useToast();
  const { isPro, loading: proLoading } = useIsPro();
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const generatedAt = new Intl.DateTimeFormat(props.isKo ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const handleDownload = useCallback(async () => {
    if (!isPro) return;
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await downloadPdfFromHtmlElement(
        previewRef.current,
        `thinkad-integrated-plan-${stamp}.pdf`,
      );
      toast("success", t("pdfDownloaded"));
    } catch {
      toast("error", t("pdfFailed"));
    } finally {
      setDownloading(false);
    }
  }, [isPro, toast, t]);

  return (
    <div className="space-y-6">
      <IntegratedReportInfoCard isKo={props.isKo} />

      <PlannerNeonCard>
        <div className={plannerNeon.cardHeader}>
          <PlannerNeonLabel>{t("reportEyebrow")}</PlannerNeonLabel>
          <h3 className={cn("mt-2 text-lg font-bold", plannerNeon.headline)}>
            {t("reportTitle")}
          </h3>
          <p className={cn("mt-1 text-sm", plannerNeon.subtext)}>
            {t("reportDesc")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 p-5 sm:p-6">
          {isPro ? (
            <BtnBlock
              variant="accent"
              size="md"
              onClick={() => void handleDownload()}
              disabled={downloading || proLoading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {t("downloadPdf")}
            </BtnBlock>
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
      </PlannerNeonCard>

      <div className="overflow-x-auto rounded-2xl border dark:border-white/10 border-gray-200 bg-muted/20 p-4">
        <IntegratedReportPreview
          ref={previewRef}
          {...props}
          isPro={isPro}
          generatedAt={generatedAt}
        />
      </div>
    </div>
  );
}
