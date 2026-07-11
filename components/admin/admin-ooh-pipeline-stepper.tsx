"use client";

import { useTranslations } from "next-intl";
import { Check, Circle } from "lucide-react";
import {
  formatPipelineTimestamp,
  nextAdminAction,
  pipelineException,
  pipelineMilestones,
  PIPELINE_STEP_IDS,
  statusToStepIndex,
  type AdminPipelineActionKey,
  type OohQuotePipelineRow,
  type PipelineStepId,
} from "@/lib/ooh-quote-pipeline";
import { cn } from "@/lib/utils";

type Props = {
  row: OohQuotePipelineRow;
  variant: "mini" | "full";
};

function stepLabelKey(id: PipelineStepId): `pipelineStep_${PipelineStepId}` {
  return `pipelineStep_${id}`;
}

function actionLabelKey(
  action: AdminPipelineActionKey,
): `pipelineAction_${AdminPipelineActionKey}` {
  return `pipelineAction_${action}`;
}

export function AdminOohPipelineStepper({ row, variant }: Props) {
  const t = useTranslations("adminOohQuotes");
  const exception = pipelineException(row);
  const milestones = pipelineMilestones(row);
  const currentIndex = statusToStepIndex(row);
  const action = nextAdminAction(row);
  const hasRevision = Boolean(row.revisionMessage?.trim());

  if (variant === "mini") {
    return (
      <div className="mt-1.5 space-y-1" aria-label={t("pipelineAriaLabel")}>
        {exception ? (
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              exception === "cancelled"
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground",
            )}
          >
            {t(`pipelineException_${exception}`)}
          </p>
        ) : (
          <div className="flex items-center gap-1">
            <div className="flex min-w-0 flex-1 gap-0.5">
              {PIPELINE_STEP_IDS.map((id, i) => {
                const done = milestones[i]?.done ?? false;
                const isCurrent = i === currentIndex;
                return (
                  <div
                    key={id}
                    title={t(stepLabelKey(id))}
                    className={cn(
                      "h-1.5 min-w-[6px] flex-1 rounded-full transition-colors",
                      done && "bg-emerald-500/80 dark:bg-emerald-400/80",
                      isCurrent &&
                        !done &&
                        "animate-pulse bg-violet-500 dark:bg-violet-400",
                      !done &&
                        !isCurrent &&
                        "bg-muted-foreground/25 dark:bg-hero-fg/15",
                    )}
                  />
                );
              })}
            </div>
            {hasRevision ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-amber-500 ring-2 ring-amber-500/30"
                title={t("revisionRequestBadge")}
                aria-label={t("revisionRequestBadge")}
              />
            ) : null}
          </div>
        )}
        {!exception && action ? (
          <p className="truncate text-[10px] text-muted-foreground">
            {t("pipelineNext")}: {t(actionLabelKey(action))}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border/60 bg-card/40 p-4 dark:bg-card/20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t("pipelineTitle")}
      </p>

      {exception ? (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2 text-sm",
            exception === "cancelled"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          <p className="font-semibold">{t(`pipelineException_${exception}`)}</p>
          {exception === "cancelled" && row.cancelReason ? (
            <p className="mt-1 text-xs opacity-90">{row.cancelReason}</p>
          ) : null}
        </div>
      ) : (
        <>
          {action ? (
            <p
              className={cn(
                "mt-3 rounded-md border px-3 py-2 text-sm font-medium",
                action === "awaitingSignature"
                  ? "animate-pulse border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200"
                  : "border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100",
              )}
            >
              {t("pipelineNext")}: {t(actionLabelKey(action))}
            </p>
          ) : currentIndex === PIPELINE_STEP_IDS.length - 1 &&
            milestones.every((m) => m.done) ? (
            <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {t("pipelineComplete")}
            </p>
          ) : null}

          <div className="mt-4 space-y-3">
            {milestones.map((milestone, i) => {
              const done = milestone.done;
              const isCurrent = i === currentIndex && !done;
              const at = formatPipelineTimestamp(milestone.at);
              return (
                <div key={milestone.id} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border-2",
                      done &&
                        "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500",
                      isCurrent &&
                        "animate-pulse border-violet-500 bg-violet-500/15 text-violet-600 dark:border-violet-400 dark:text-violet-300",
                      !done &&
                        !isCurrent &&
                        "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Circle className="h-2.5 w-2.5" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        done && "text-foreground",
                        isCurrent && "text-violet-700 dark:text-violet-200",
                        !done && !isCurrent && "text-muted-foreground",
                      )}
                    >
                      {t(stepLabelKey(milestone.id))}
                      {isCurrent ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-violet-500 dark:text-violet-300">
                          {t("pipelineCurrent")}
                        </span>
                      ) : null}
                    </p>
                    {at ? (
                      <p className="text-xs text-muted-foreground">{at}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
