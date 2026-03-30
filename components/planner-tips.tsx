"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";

type Props = {
  wizardStep: number;
  campaignGoal: PlannerCampaignGoal | null;
  campaignMediaCount: number;
  hasCreative: boolean;
  budgetNum: number;
};

export default function PlannerTips({
  wizardStep,
  campaignGoal,
  campaignMediaCount,
  hasCreative,
  budgetNum,
}: Props) {
  const t = useTranslations("planner");

  const tipKey =
    wizardStep === 1 && !campaignGoal
      ? "tipStep1"
      : wizardStep === 1
        ? "tipStep1Done"
        : wizardStep === 2 && campaignMediaCount === 0
          ? "tipStep2"
          : wizardStep === 2
            ? "tipStep2Done"
            : wizardStep === 3 && !hasCreative
              ? "tipStep3"
              : wizardStep === 3
                ? "tipStep3Done"
                : wizardStep === 4 && budgetNum <= 100
                  ? "tipStep4Budget"
                  : wizardStep === 5
                    ? "tipStep5"
                    : wizardStep === 6
                    ? "tipStep6"
                    : wizardStep === 7
                      ? "tipStep7"
                      : "tipDefault";

  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 to-transparent px-4 py-3 text-sm text-navy shadow-sm",
      )}
      role="status"
    >
      <Lightbulb
        className="mt-0.5 h-5 w-5 shrink-0 text-gold"
        aria-hidden
      />
      <p className="leading-relaxed">{t(tipKey)}</p>
    </div>
  );
}
