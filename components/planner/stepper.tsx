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
};

export function PlannerStepper({
  currentStep,
  stepOfLabel,
  stepLabels,
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
          return (
            <li key={s} className="flex items-center gap-2 sm:gap-4">
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
