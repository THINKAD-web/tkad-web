"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_ORDER = [
  "draft",
  "sent",
  "booking_requested",
  "booking_pending",
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
] as const;

type StepId = "quote" | "booking" | "esign" | "invoice" | "contract";

type StepDef = {
  id: StepId;
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

function statusLevel(status: string): number {
  const i = (STATUS_ORDER as readonly string[]).indexOf(status);
  return i >= 0 ? i : 0;
}

function isStepDone(
  step: StepId,
  level: number,
  contractSigned: boolean,
): boolean {
  switch (step) {
    case "quote":
      return level >= 1;
    case "booking":
      return level >= 4;
    case "esign":
      return contractSigned;
    case "invoice":
      return level >= 5;
    case "contract":
      return level >= 8;
    default:
      return false;
  }
}

function resolveCurrentStepId(
  status: string,
  level: number,
  contractSigned: boolean,
): StepId | null {
  for (const step of STEPS) {
    if (!isStepDone(step.id, level, contractSigned)) {
      return step.id;
    }
  }
  return null;
}

export function QuoteStatusTimeline({
  status,
  contractSigned,
}: {
  status: string;
  contractSigned: boolean;
}) {
  const t = useTranslations("quoteCustomer");
  const level = statusLevel(status);
  const currentId = resolveCurrentStepId(status, level, contractSigned);

  return (
    <div className="space-y-4">
      {STEPS.map((step) => {
        const done = isStepDone(step.id, level, contractSigned);
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
                  "animate-pulse border-violet-500 bg-violet-500/15 text-violet-600 dark:border-violet-400 dark:text-violet-300",
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
                  isCurrent && !done && "text-violet-700 dark:text-violet-200",
                  !done && !isCurrent && "text-muted-foreground",
                )}
              >
                {label}
                {isCurrent && !done ? (
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-300">
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
