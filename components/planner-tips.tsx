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

  // 6단계 재배치: 1=목표, 2=타깃·지역, 3=예산·기간, 4=매체선택, 5=로고, 6=보고서, 7=결과 대시보드
  const tipKey =
    wizardStep === 1 && !campaignGoal
      ? "tipStep1"
      : wizardStep === 1
        ? "tipStep1Done"
        : wizardStep === 2
          ? "tipStep5"
          : wizardStep === 3 && budgetNum < 500
            ? "tipStep4Budget"
            : wizardStep === 3
              ? "tipStep4Budget"
              : wizardStep === 4 && campaignMediaCount === 0
                ? "tipStep2"
                : wizardStep === 4
                  ? "tipStep2Done"
                  : wizardStep === 5 && !hasCreative
                    ? "tipStep3"
                    : wizardStep === 5
                      ? "tipStep3Done"
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
