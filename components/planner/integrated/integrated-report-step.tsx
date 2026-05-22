"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileDown, Loader2 } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import type { MediaItem } from "@/lib/media-data";
import type { IntegratedCampaignMetrics } from "@/lib/planner/integrated-metrics";
import type { DigitalRecommendResult } from "@/lib/planner/recommend-digital";
import { downloadPdfFromHtmlElement } from "@/lib/html-to-pdf";
import { useToast } from "@/components/toast-provider";
import IntegratedReportPreview from "@/components/planner/integrated/integrated-report-preview";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  isKo: boolean;
  goalTitle: string;
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const generatedAt = new Intl.DateTimeFormat(props.isKo ? "ko-KR" : "en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const handleDownload = useCallback(async () => {
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
  }, [toast, t]);

  return (
    <div className="space-y-6">
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
          <BtnBlock
            variant="accent"
            size="md"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {t("downloadPdf")}
          </BtnBlock>
        </div>
      </PlannerNeonCard>

      <div className="overflow-x-auto rounded-2xl border dark:border-white/10 border-gray-200 bg-muted/20 p-4">
        <IntegratedReportPreview
          ref={previewRef}
          {...props}
          generatedAt={generatedAt}
        />
      </div>
    </div>
  );
}
