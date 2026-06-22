"use client";

import { Sparkles } from "lucide-react";
import type {
  AppliedPlannerScenario,
  ScenarioVariant,
} from "@/lib/planner/scenario-types";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  scenario: AppliedPlannerScenario;
  isKo: boolean;
  variantLabels: Record<ScenarioVariant, string>;
};

export function PlannerScenarioContextBanner({
  scenario,
  isKo,
  variantLabels,
}: Props) {
  const t = useTranslations("planner");
  const label = isKo ? scenario.labelKo : scenario.labelEn;
  const description = isKo ? scenario.descriptionKo : scenario.descriptionEn;
  const variantLabel = variantLabels[scenario.variant];

  return (
    <PlannerNeonCard className="border-violet-400/25">
      <div className="p-5 sm:p-6">
        <PlannerNeonLabel className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" aria-hidden />
          {t("scenarioContextTitle")}
        </PlannerNeonLabel>
        <p className={cn("mt-3 text-sm font-bold", plannerNeon.headline)}>
          {t("scenarioContextHeadline", { variant: variantLabel, label })}
        </p>
        <p className={cn("mt-2 text-sm leading-relaxed", plannerNeon.subtext)}>
          {description}
        </p>
        <p className={cn("mt-2 text-xs", plannerNeon.subtext)}>
          {t(`scenarioContextHint_${scenario.variant}`)}
        </p>
      </div>
    </PlannerNeonCard>
  );
}
