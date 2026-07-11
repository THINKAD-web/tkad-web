"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import {
  PLANNER_GYEONGGI_ZONE_KEYS,
  PLANNER_GYEONGGI_ZONE_LABELS,
  type PlannerGyeonggiZoneKey,
} from "@/lib/planner/gyeonggi-zones";
import {
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  selected: readonly PlannerGyeonggiZoneKey[];
  suggested: readonly PlannerGyeonggiZoneKey[];
  isKo: boolean;
  onToggle: (zone: PlannerGyeonggiZoneKey) => void;
  onClear: () => void;
  onApplySuggested: () => void;
  embedded?: boolean;
};

export function PlannerGyeonggiZoneChips({
  selected,
  suggested,
  isKo,
  onToggle,
  onClear,
  onApplySuggested,
  embedded = false,
}: Props) {
  const t = useTranslations("planner");

  const suggestedSet = new Set(suggested);
  const noneSelected = selected.length === 0;

  const chipClass = (active: boolean, isSuggested: boolean) =>
    cn(
      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all touch-manipulation sm:text-sm",
      active
        ? "bg-violet-600 text-white shadow-sm shadow-violet-500/25"
        : isSuggested
          ? "border border-violet-400/40 bg-violet-500/10 text-violet-900 dark:text-violet-100"
          : "dark:bg-white/10 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:text-white/85 dark:hover:bg-white/15",
    );

  const body = (
    <div className={cn("space-y-3", embedded ? "pt-1" : "p-5 sm:p-6")}>
      <div className="flex flex-wrap gap-2">
        {PLANNER_GYEONGGI_ZONE_KEYS.map((key) => {
          const active = selected.includes(key);
          const isSuggested = suggestedSet.has(key) && !active;
          const label = isKo
            ? PLANNER_GYEONGGI_ZONE_LABELS[key].labelKo
            : PLANNER_GYEONGGI_ZONE_LABELS[key].labelEn;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              aria-pressed={active}
              className={chipClass(active, isSuggested)}
            >
              {label}
              {isSuggested ? (
                <span className="text-[10px] opacity-70">
                  {t("seoulZoneSuggested")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApplySuggested}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-violet-300/40 px-3 py-1.5 text-xs font-medium touch-manipulation",
            "text-violet-800 hover:bg-violet-500/10 dark:text-violet-200",
          )}
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          {t("gyeonggiZonesApplySuggested")}
        </button>
        {noneSelected ? (
          <span className={cn("text-xs", plannerNeon.subtext)}>
            {t("gyeonggiZonesAllGyeonggi")}
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
            {t("gyeonggiZonesClear")}
          </button>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="mt-4 border-t dark:border-white/10 border-gray-200 pt-4">
        <PlannerNeonLabel className="mb-2 block text-xs">
          {t("gyeonggiZonesTitle")}
        </PlannerNeonLabel>
        <p className={cn("mb-3 text-xs", plannerNeon.subtext)}>
          {t("gyeonggiZonesDesc")}
        </p>
        {body}
      </div>
    );
  }

  return (
    <div className={plannerNeon.card}>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{t("gyeonggiZonesTitle")}</PlannerNeonLabel>
        <p className={cn("mt-2 text-sm", plannerNeon.subtext)}>
          {t("gyeonggiZonesDesc")}
        </p>
      </div>
      {body}
    </div>
  );
}
