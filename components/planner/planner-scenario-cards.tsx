"use client";

import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerScenario } from "@/lib/planner/scenario-types";
import {
  PlannerNeonCard,
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";

type Props = {
  scenarios: PlannerScenario[];
  selectedId: string | null;
  /** 카드 클릭 — 선택(하이라이트)만 */
  onSelect: (scenario: PlannerScenario) => void;
  /** 명시적 적용 버튼 — 시나리오 반영 + 단계 이동 */
  onApply: (scenario: PlannerScenario) => void;
  isKo: boolean;
  title: string;
  hint: string;
  applyLabel: string;
  variantLabels: Record<PlannerScenario["variant"], string>;
};

export function PlannerScenarioCards({
  scenarios,
  selectedId,
  onSelect,
  onApply,
  isKo,
  title,
  hint,
  applyLabel,
  variantLabels,
}: Props) {
  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          {title}
        </PlannerNeonLabel>
        <p className={cn("mt-2 text-xs leading-relaxed", plannerNeon.subtext)}>
          {hint}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
        {scenarios.map((scenario) => {
          const selected = selectedId === scenario.id;
          const label = isKo ? scenario.labelKo : scenario.labelEn;
          const description = isKo
            ? scenario.descriptionKo
            : scenario.descriptionEn;
          return (
            <div
              key={scenario.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(scenario)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(scenario);
                }
              }}
              className={cn(
                plannerNeon.selectChip,
                "touch-manipulation cursor-pointer p-4 text-left transition-colors",
                selected
                  ? plannerNeon.selectChipActive
                  : plannerNeon.selectChipIdle,
                "hover:border-violet-300/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    selected
                      ? "border-violet-300/50 bg-violet-500/20 text-violet-100"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {variantLabels[scenario.variant]}
                </span>
                {selected ? (
                  <Check className="h-4 w-4 shrink-0 text-violet-400" />
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-3 text-sm font-bold leading-snug",
                  plannerNeon.headline,
                )}
              >
                {label}
              </p>
              <p
                className={cn(
                  "mt-2 text-xs leading-relaxed",
                  plannerNeon.subtext,
                )}
              >
                {description}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(scenario);
                }}
                className={cn(
                  "mt-3 w-full rounded-lg border px-3 py-2 text-[11px] font-semibold transition-colors",
                  selected
                    ? "border-violet-400/50 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30"
                    : "border-violet-300/30 text-violet-300/90 hover:border-violet-300/50 hover:bg-violet-500/10",
                )}
              >
                {applyLabel}
              </button>
            </div>
          );
        })}
      </div>
    </PlannerNeonCard>
  );
}
