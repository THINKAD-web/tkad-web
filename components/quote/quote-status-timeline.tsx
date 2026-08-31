"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import {
  isQuoteTimelineStepDone,
  quoteStatusLevel,
  resolveQuoteTimelineCurrentStep,
  type QuoteTimelineStepId,
} from "@/lib/quote-status-timeline";
import { cn } from "@/lib/utils";

type StepDef = {
  id: QuoteTimelineStepId;
  labelKey:
    | "milestone_quoteSent"
    | "milestone_bookingConfirmed"
    | "milestone_esign"
    | "milestone_invoice"
    | "milestone_contract";
};

const STEPS: StepDef[] = [
  { id: "quote", labelKey: "milestone_quoteSent" },
  { id: "booking", labelKey: "milestone_bookingConfirmed" },
  { id: "esign", labelKey: "milestone_esign" },
  { id: "invoice", labelKey: "milestone_invoice" },
  { id: "contract", labelKey: "milestone_contract" },
];

export function QuoteStatusTimeline({
  status,
  contractSigned,
}: {
  status: string;
  contractSigned: boolean;
}) {
  const t = useTranslations("quoteCustomer");
  const level = quoteStatusLevel(status);
  const currentId = resolveQuoteTimelineCurrentStep(status, contractSigned);

  return (
    <div className="space-y-4">
      {STEPS.map((step) => {
        const done = isQuoteTimelineStepDone(step.id, level, contractSigned);
        const isCurrent = currentId === step.id;
        const label = t(step.labelKey);

        return (
          <div key={step.id} className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border-2",
                done &&
                  "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500",
                isCurrent &&
                  !done &&
                  "animate-pulse border-[color:var(--qp-accent)] bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
                !done &&
                  !isCurrent &&
                  "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Circle className="h-3 w-3" aria-hidden />
              )}
            </div>
            <div className="min-w-0 pt-0.5">
              <p
                className={cn(
                  "text-sm font-bold",
                  done && "text-foreground",
                  isCurrent && !done && "text-[color:var(--qp-accent)]",
                  !done && !isCurrent && "text-muted-foreground",
                )}
              >
                {label}
                {isCurrent && !done ? (
                  <span className="ml-2 tkad-type-note font-semibold uppercase tracking-wider text-[color:var(--qp-accent)]">
                    {t("timelineCurrent")}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
