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
  /** 통합 플래너(7입력+8대시보드) — 단계 번호를 OOH 플래너 tip 규칙에 매핑 */
  variant?: "planner" | "integrated";
  /** Step1 등 — 한 줄 보조 문구 (박스 없음) */
  compact?: boolean;
};

function integratedPlannerTipStep(wizardStep: number): number {
  if (wizardStep <= 4) return wizardStep;
  if (wizardStep === 5) return 5;
  if (wizardStep === 6) return 5;
  if (wizardStep === 7) return 6;
  return 7;
}

export default function PlannerTips({
  wizardStep,
  campaignGoal,
  campaignMediaCount,
  hasCreative,
  budgetNum,
  variant = "planner",
  compact = false,
}: Props) {
  const t = useTranslations("planner");

  const step =
    variant === "integrated" ? integratedPlannerTipStep(wizardStep) : wizardStep;
  const isIntegratedDigital = variant === "integrated" && wizardStep === 5;

  const tipKey = isIntegratedDigital
    ? "tipIntegratedDigital"
    : step === 1 && !campaignGoal
      ? "tipStep1"
      : step === 1
        ? "tipStep1Done"
        : step === 2
          ? "tipStep5"
          : step === 3 && budgetNum < 500
            ? "tipStep4Budget"
            : step === 3
              ? "tipStep4Budget"
              : step === 4 && campaignMediaCount === 0
                ? "tipStep2"
                : step === 4
                  ? "tipStep2Done"
                  : step === 5 && !hasCreative
                    ? "tipStep3"
                    : step === 5
                      ? "tipStep3Done"
                      : step === 6
                        ? "tipStep6"
                        : step === 7
                          ? "tipStep7"
                          : "tipDefault";

  const tipText = t(tipKey);

  if (compact) {
    if (step === 1 && !campaignGoal) return null;
    return (
      <p
        className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left"
        role="status"
      >
        {tipText}
      </p>
    );
  }

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
        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
          [ TIP ]
        </p>
        <p className="mt-1 leading-relaxed text-foreground">{tipText}</p>
      </div>
    </div>
  );
}
