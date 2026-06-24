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
};

export function PlannerCampaignGoalGrid({
  selected,
  onSelect,
  className,
  compact = false,
}: Props) {
  const t = useTranslations("planner");

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2",
        !compact && "sm:grid-cols-2 sm:gap-3",
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
              compact ? "p-3" : "p-5",
              active ? plannerNeon.selectChipActive : plannerNeon.selectChipIdle,
            )}
          >
            <p
              className={cn(
                "font-semibold tracking-normal",
                compact ? "text-sm" : undefined,
              )}
            >
              {t(titleKey)}
            </p>
            <p
              className={cn(
                "leading-relaxed",
                compact ? "mt-1 text-[11px]" : "mt-2 text-xs",
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
