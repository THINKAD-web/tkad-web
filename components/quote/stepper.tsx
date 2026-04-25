"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  QUOTE_LAST_INPUT_STEP,
  type QuoteWizardStep,
} from "@/lib/quote/types";

const STEP_NUMBERS: ReadonlyArray<QuoteWizardStep> = [1, 2, 3, 4];

type Props = {
  /** 현재 단계(1~4 입력, 5 컨펌). 5단계에서는 모든 점이 완료 표시. */
  currentStep: QuoteWizardStep;
  /** 접근성 그룹 라벨 — 예: "Step {current} of 4" */
  stepOfLabel: string;
  /** step → 단계 라벨. 누락된 키는 숫자만 표시. */
  stepLabels?: Partial<Record<QuoteWizardStep, string>>;
  /** 완료된 단계로 직접 이동(미완료/현재 단계 클릭은 무시). */
  onStepClick?: (step: QuoteWizardStep) => void;
  /** stepper 가 어디에 임베드되든 호환되도록 컨테이너 클래스 override. */
  className?: string;
};

export function QuoteStepper({
  currentStep,
  stepOfLabel,
  stepLabels,
  onStepClick,
  className,
}: Props) {
  const isAllComplete = currentStep > QUOTE_LAST_INPUT_STEP;
  return (
    <div
      className={cn(
        "mb-8 flex flex-col items-center gap-3",
        className,
      )}
      role="group"
      aria-label={stepOfLabel}
    >
      <p className="text-sm font-semibold text-navy">{stepOfLabel}</p>
      <ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {STEP_NUMBERS.map((s) => {
          const isCurrent = !isAllComplete && currentStep === s;
          const isComplete = isAllComplete || currentStep > s;
          const label = stepLabels?.[s];
          const clickable = Boolean(onStepClick) && (isComplete || isCurrent);
          const ariaLabel = label ? `${s}. ${label}` : `Step ${s}`;
          return (
            <li key={s} className="flex items-center gap-2 sm:gap-4">
              {clickable ? (
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={ariaLabel}
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
                  aria-label={ariaLabel}
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
              {s < QUOTE_LAST_INPUT_STEP ? (
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
      {/* 모바일에서만 현재 단계 라벨 노출 — 점 위 공간 절약 */}
      {stepLabels?.[currentStep] && !isAllComplete ? (
        <p className="text-xs text-muted-foreground sm:hidden">
          {stepLabels[currentStep]}
        </p>
      ) : null}
    </div>
  );
}
