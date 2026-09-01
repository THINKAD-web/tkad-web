"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTEGRATED_LAST_INPUT_STEP,
  type IntegratedWizardStep,
} from "@/lib/planner/integrated-types";

const STEP_NUMBERS: ReadonlyArray<IntegratedWizardStep> = [1, 2, 3, 4, 5, 6, 7];

type Props = {
  currentStep: IntegratedWizardStep;
  stepOfLabel: string;
  onStepClick?: (step: IntegratedWizardStep) => void;
};

export function IntegratedPlannerStepper({
  currentStep,
  stepOfLabel,
  onStepClick,
}: Props) {
  return (
    <div
      className="mb-10 flex flex-col items-center gap-4"
      role="group"
      aria-label={stepOfLabel}
    >
      <p className="tkad-type-label text-primary">
        [ {stepOfLabel} ]
      </p>
      <ol className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        {STEP_NUMBERS.map((s) => {
          const isCurrent = currentStep === s;
          const isComplete = currentStep > s;
          const clickable = Boolean(onStepClick) && (isComplete || isCurrent);
          return (
            <li key={s} className="flex items-center gap-1 sm:gap-2">
              {clickable ? (
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => onStepClick?.(s)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border-2  text-xs font-bold transition-colors sm:h-10 sm:w-10 sm:text-sm",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-foreground hover:text-background",
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : s}
                </button>
              ) : (
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center border-2  text-xs font-bold sm:h-10 sm:w-10 sm:text-sm",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isComplete
                        ? "border-border bg-card text-foreground"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
              )}
              {s < INTEGRATED_LAST_INPUT_STEP ? (
                <div
                  aria-hidden
                  className={cn(
                    "hidden h-[2px] w-4 sm:block sm:w-6",
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
