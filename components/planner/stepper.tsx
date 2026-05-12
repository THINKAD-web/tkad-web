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
      className="mb-10 flex flex-col items-center gap-4"
      role="group"
      aria-label={stepOfLabel}
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
        [ {stepOfLabel} ]
      </p>
      <ol className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3">
        {STEP_NUMBERS.map((s) => {
          const isCurrent = currentStep === s;
          const isComplete = currentStep > s;
          const label = stepLabels?.[s];
          const clickable = Boolean(onStepClick) && (isComplete || isCurrent);
          return (
            <li key={s} className="flex items-center gap-1.5 sm:gap-3">
              {clickable ? (
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={label ? `${s}. ${label}` : `Step ${s}`}
                  onClick={() => onStepClick?.(s)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center border-2 font-mono text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground cursor-default"
                      : "border-border bg-card text-foreground hover:bg-foreground hover:text-background cursor-pointer",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden /> : s}
                </button>
              ) : (
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={label ? `${s}. ${label}` : `Step ${s}`}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center border-2 font-mono text-sm font-bold",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isComplete
                        ? "border-border bg-card text-foreground"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" aria-hidden /> : s}
                </div>
              )}
              {s < PLANNER_LAST_INPUT_STEP ? (
                <div
                  aria-hidden
                  className={cn(
                    "hidden h-[2px] w-8 sm:block sm:w-10",
                    isComplete ? "bg-primary" : "bg-border",
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
