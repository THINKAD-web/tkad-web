"use client";

import { useTranslations } from "next-intl";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import { PLANNER_CAMPAIGN_GOAL_DEFS } from "@/lib/planner/campaign-goal-defs";
import { plannerNeon } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

type Props = {
  selected: PlannerCampaignGoal | null;
  onSelect: (key: PlannerCampaignGoal) => void;
  className?: string;
  /** 내 플랜 사이드 패널 등 좁은 영역 */
  compact?: boolean;
  /** Step1 above-fold — 모바일에서도 2열·작은 패딩 */
  dense?: boolean;
};

export function PlannerCampaignGoalGrid({
  selected,
  onSelect,
  className,
  compact = false,
  dense = false,
}: Props) {
  const t = useTranslations("planner");

  return (
    <div
      className={cn(
        "grid gap-2",
        dense ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 sm:gap-3",
        className,
      )}
    >
      {PLANNER_CAMPAIGN_GOAL_DEFS.map(({ key, titleKey, descKey }) => {
        const active = selected === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              plannerNeon.selectChip,
              "h-full w-full text-left",
              compact ? "p-3" : dense ? "p-3 sm:p-3.5" : "p-5",
              active ? plannerNeon.selectChipActive : plannerNeon.selectChipIdle,
            )}
          >
            <p
              className={cn(
                "font-semibold tracking-normal",
                compact || dense ? "text-sm" : undefined,
              )}
            >
              {t(titleKey)}
            </p>
            <p
              className={cn(
                "leading-relaxed",
                compact || dense ? "mt-0.5 text-[11px]" : "mt-2 text-xs",
                active
                  ? "dark:text-white/70 text-gray-600"
                  : plannerNeon.subtext,
              )}
            >
              {t(descKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
