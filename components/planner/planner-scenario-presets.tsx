"use client";

import { useTranslations } from "next-intl";
import {
  PLANNER_SCENARIO_PRESETS,
  type PlannerScenarioPresetId,
} from "@/lib/planner/scenario-presets";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  onApply: (id: PlannerScenarioPresetId) => void;
};

export function PlannerScenarioPresets({ onApply }: Props) {
  const t = useTranslations("planner");

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{t("scenarioPresetsTitle")}</PlannerNeonLabel>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("scenarioPresetsDesc")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2 sm:gap-3 sm:p-6">
        {PLANNER_SCENARIO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onApply(preset.id)}
            className={cn(
              plannerNeon.selectChip,
              "touch-manipulation p-4 text-left",
              plannerNeon.selectChipIdle,
              "hover:border-[color:var(--qp-accent)]/40",
            )}
          >
            <p className={cn("font-bold text-sm", plannerNeon.headline)}>
              {t(preset.titleKey)}
            </p>
            <p className={cn("mt-1.5 text-xs leading-relaxed", plannerNeon.subtext)}>
              {t(preset.descKey)}
            </p>
          </button>
        ))}
      </div>
    </PlannerNeonCard>
  );
}
