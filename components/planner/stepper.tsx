"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLANNER_LAST_INPUT_STEP,
  type PlannerWizardStep,
} from "@/lib/planner/types";

const STEP_NUMBERS: ReadonlyArray<PlannerWizardStep> = [1, 2, 3, 4, 5, 6];

type Props = {
  currentStep: PlannerWizardStep;
  stepOfLabel: string;
  stepLabels?: Partial<Record<PlannerWizardStep, string>>;
  /** 완료된 단계로 직접 이동. 미완료 단계 클릭은 무시됨. */
  onStepClick?: (step: PlannerWizardStep) => void;
};

export function PlannerStepper({
  currentStep,
  stepOfLabel,
  stepLabels,
  onStepClick,
}: Props) {
  return (
    <div
      className="mb-8 flex flex-col items-center gap-3"
      role="group"
      aria-label={stepOfLabel}
    >
      <p className="text-sm font-semibold text-navy">{stepOfLabel}</p>
      <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {STEP_NUMBERS.map((s) => {
          const isCurrent = currentStep === s;
          const isComplete = currentStep > s;
          const label = stepLabels?.[s];
          const clickable = Boolean(onStepClick) && (isComplete || isCurrent);
          return (
            <li key={s} className="flex items-center gap-2 sm:gap-4">
              {clickable ? (
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={label ? `${s}. ${label}` : `Step ${s}`}
                  onClick={() => onStepClick?.(s)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60",
                    isCurrent
                      ? "bg-gold text-navy shadow-md cursor-default"
                      : "bg-navy/15 text-navy ring-2 ring-gold/50 hover:bg-navy/25 cursor-pointer",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden /> : s}
                </button>
              ) : (
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={label ? `${s}. ${label}` : `Step ${s}`}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    isCurrent
                      ? "bg-gold text-navy shadow-md"
                      : isComplete
                        ? "bg-navy/15 text-navy ring-2 ring-gold/50"
                        : "bg-slate-200 text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden /> : s}
                </div>
              )}
              {s < PLANNER_LAST_INPUT_STEP ? (
                <div
                  aria-hidden
                  className={cn(
                    "hidden h-0.5 w-8 sm:block sm:w-10",
                    isComplete ? "bg-gold/70" : "bg-slate-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
