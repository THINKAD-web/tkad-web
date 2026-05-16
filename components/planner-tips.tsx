"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PLANNER_RESULT_STEP } from "@/lib/planner/types";
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
  budgetNum,
}: Props) {
  const t = useTranslations("planner");

  const tipKey =
    wizardStep === 1 && !campaignGoal
      ? "tipBrandIntro"
      : wizardStep === 1
        ? "tipBrandDone"
        : wizardStep === 2 && budgetNum < 500
          ? "tipStep4Budget"
          : wizardStep === 2
            ? "tipBudgetSchedule"
            : wizardStep === 3 && campaignMediaCount === 0
              ? "tipAiPending"
              : wizardStep === 3
                ? "tipAiDone"
                : wizardStep === 4
                  ? "tipSaveShare"
                  : wizardStep === PLANNER_RESULT_STEP
                    ? "tipStep7"
                    : "tipDefault";

  return (
    <div
      className={cn(
        "flex gap-3 border-2 border-primary bg-card px-4 py-3 text-sm text-foreground",
      )}
      role="status"
    >
      <Lightbulb
        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ TIP ]
        </p>
        <p className="mt-1 leading-relaxed text-foreground">{t(tipKey)}</p>
      </div>
    </div>
  );
}
