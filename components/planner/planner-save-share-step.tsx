"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Link2, Send } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { buildPlannerHrefWithMediaIds } from "@/lib/planner-media-href";
import { usePlannerStore } from "@/lib/planner/store";

type Props = {
  shareUrl: string | null;
  saving: boolean;
  onSave: () => void;
  onQuote: () => void;
};

export function PlannerSaveShareStep({
  shareUrl,
  saving,
  onSave,
  onQuote,
}: Props) {
  const t = useTranslations("planner");
  const locale = useLocale();
  const brandName = usePlannerStore((s) => s.brandName);
  const campaignMediaIds = usePlannerStore((s) => s.campaignMediaIds);
  const plannerHref = buildPlannerHrefWithMediaIds(campaignMediaIds);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ STEP 4 / SAVE · SHARE ]
        </p>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {t("stepSaveTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("stepSaveDesc")}</p>
      </div>

      <div className="border-2 border-border bg-card p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("planSummaryLabel")}
        </p>
        <p className="mt-2 text-lg font-bold text-foreground">{brandName || "—"}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          {t("planMediaCount", { count: campaignMediaIds.length })}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <BtnBlock
          variant="accent"
          size="md"
          onClick={onQuote}
          className="inline-flex items-center gap-2"
        >
          <Send className="h-4 w-4" aria-hidden />
          {t("ctaQuoteFromPlan")}
        </BtnBlock>
        <BtnBlock
          variant="primary"
          size="md"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2"
        >
          <Link2 className="h-4 w-4" aria-hidden />
          {saving ? t("savingPlan") : t("ctaSaveShare")}
        </BtnBlock>
        <BtnBlock href={plannerHref} variant="secondary" size="md">
          {t("editMediaInPlanner")}
        </BtnBlock>
      </div>

      {shareUrl ? (
        <div className="border-2 border-primary bg-card p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {t("shareLinkLabel")}
          </p>
          <a
            href={shareUrl}
            className="mt-2 block break-all font-mono text-sm text-accent hover:underline"
          >
            {shareUrl}
          </a>
          <p className="mt-2 text-xs text-muted-foreground">{t("shareLinkHint")}</p>
        </div>
      ) : (
        <p className="font-mono text-[11px] text-muted-foreground">{t("saveShareHint")}</p>
      )}

      <Link
        href="/login"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-accent"
      >
        {t("loginToSyncPlan")}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
