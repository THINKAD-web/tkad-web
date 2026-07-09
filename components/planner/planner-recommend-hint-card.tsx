"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

export function PlannerRecommendHintCard() {
  const t = useTranslations("planner");

  return (
    <PlannerNeonCard className="overflow-hidden border-cyan-400/20">
      <div className={cn(plannerNeon.cardHeader, "pb-4")}>
        <PlannerNeonLabel className="!text-cyan-700 dark:!text-cyan-300">
          {t("recommendHintEyebrow")}
        </PlannerNeonLabel>
        <h3
          className={cn(
            "mt-2 flex items-start gap-2 text-base sm:text-lg",
            plannerNeon.headline,
          )}
        >
          <Sparkles
            className="mt-0.5 h-5 w-5 shrink-0 text-violet-400"
            aria-hidden
          />
          {t("recommendHintTitle")}
        </h3>
        <p className={cn("mt-2 text-sm leading-relaxed", plannerNeon.subtext)}>
          {t("recommendHintDesc")}
        </p>
      </div>
      <div className="border-t dark:border-white/10 border-gray-100 px-5 pb-5 pt-4 sm:px-6">
        <Link
          href="/recommend"
          className={cn(plannerNeon.ctaSm, "w-full sm:w-auto")}
        >
          {t("recommendHintCta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </PlannerNeonCard>
  );
}
