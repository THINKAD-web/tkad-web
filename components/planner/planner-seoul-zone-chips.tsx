"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import {
  PLANNER_SEOUL_ZONE_KEYS,
  PLANNER_SEOUL_ZONE_LABELS,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  selected: readonly PlannerSeoulZoneKey[];
  suggested: readonly PlannerSeoulZoneKey[];
  isKo: boolean;
  onToggle: (zone: PlannerSeoulZoneKey) => void;
  onClear: () => void;
  onApplySuggested: () => void;
};

export function PlannerSeoulZoneChips({
  selected,
  suggested,
  isKo,
  onToggle,
  onClear,
  onApplySuggested,
}: Props) {
  const t = useTranslations("planner");

  const suggestedSet = new Set(suggested);
  const noneSelected = selected.length === 0;

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{t("seoulZonesTitle")}</PlannerNeonLabel>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("seoulZonesDesc")}
        </p>
      </div>
      <div className="space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {PLANNER_SEOUL_ZONE_KEYS.map((key) => {
            const active = selected.includes(key);
            const isSuggested = suggestedSet.has(key) && !active;
            const label = isKo
              ? PLANNER_SEOUL_ZONE_LABELS[key].labelKo
              : PLANNER_SEOUL_ZONE_LABELS[key].labelEn;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                className={cn(
                  plannerNeon.selectChip,
                  "touch-manipulation min-h-[2.75rem]",
                  active
                    ? plannerNeon.selectChipActive
                    : isSuggested
                      ? "border-violet-400/50 bg-violet-500/8 text-violet-700 dark:text-violet-200"
                      : plannerNeon.selectChipIdle,
                )}
              >
                {label}
                {isSuggested ? (
                  <span className="ml-1 text-[10px] opacity-70">
                    {t("seoulZoneSuggested")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApplySuggested}
            className={cn(
              plannerNeon.selectChip,
              "touch-manipulation inline-flex items-center gap-1.5 text-xs",
              plannerNeon.selectChipIdle,
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            {t("seoulZonesApplySuggested")}
          </button>
          {noneSelected ? (
            <span className={cn("self-center text-xs", plannerNeon.subtext)}>
              {t("seoulZonesAllSeoul")}
            </span>
          ) : (
            <button
              type="button"
              onClick={onClear}
              className={cn(
                "touch-manipulation text-xs underline-offset-2 hover:underline",
                plannerNeon.subtext,
              )}
            >
              {t("seoulZonesClear")}
            </button>
          )}
        </div>
      </div>
    </PlannerNeonCard>
  );
}
