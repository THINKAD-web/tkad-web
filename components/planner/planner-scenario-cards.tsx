"use client";

import { Check } from "lucide-react";
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
  /** 상위 카드에 제목이 있을 때 그리드만 렌더 */
  embedded?: boolean;
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
  embedded = false,
}: Props) {
  const grid = (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
        embedded ? "p-4 sm:p-5" : "p-5 sm:p-6",
      )}
    >
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
              "hover:border-[color:var(--qp-accent)]/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "inline-block rounded-full border px-2 py-0.5 tkad-type-note font-medium uppercase tracking-wider",
                  selected
                    ? "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent)]/20 text-[color:var(--qp-accent)]"
                    : "border-border text-muted-foreground",
                )}
              >
                {variantLabels[scenario.variant]}
              </span>
              {selected ? (
                <Check className="h-4 w-4 shrink-0 text-[color:var(--qp-accent)]" />
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
                "mt-3 w-full rounded-lg border px-3 py-2 tkad-type-caption font-semibold transition-colors",
                selected
                  ? "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent)]/20 text-[color:var(--qp-accent)] hover:bg-[color:var(--qp-accent)]/30"
                  : "border-[color:var(--qp-accent)]/30 text-[color:var(--qp-accent)]/90 hover:border-[color:var(--qp-accent)]/50 hover:bg-[color:var(--qp-accent)]/10",
              )}
            >
              {applyLabel}
            </button>
          </div>
        );
      })}
    </div>
  );

  if (embedded) return grid;

  return (
    <PlannerNeonCard>
      <div className={plannerNeon.cardHeader}>
        <PlannerNeonLabel>{title}</PlannerNeonLabel>
        <p className={cn("mt-2 text-xs leading-relaxed", plannerNeon.subtext)}>
          {hint}
        </p>
      </div>
      {grid}
    </PlannerNeonCard>
  );
}
