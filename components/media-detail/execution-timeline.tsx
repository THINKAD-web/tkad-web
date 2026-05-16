"use client";

import { useTranslations } from "next-intl";
import type { MediaExecutionTimeline } from "@/lib/media-execution-timeline";
import { SectionHead } from "@/components/brutalist/section-head";
import { cn } from "@/lib/utils";

type Props = {
  timeline: MediaExecutionTimeline;
  isKo: boolean;
};

export function MediaExecutionTimelineSection({ timeline, isKo }: Props) {
  const t = useTranslations("mediaDetail.execution");

  if (!timeline.hasData) return null;

  const maxCount = Math.max(1, ...timeline.months.map((m) => m.executionCount));

  return (
    <section className="mt-12 border-t-2 border-border pt-12" aria-labelledby="execution-timeline-heading">
      <SectionHead
        number="06"
        category={isKo ? "History" : "History"}
        title={t("title")}
        meta={t("desc")}
        className="mb-6"
      />
      <div className="border-2 border-border bg-card p-5 sm:p-6">
        <p
          id="execution-timeline-heading"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent"
        >
          {t("summary", { count: timeline.uniqueBrandCount })}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {timeline.months.map((month) => {
            const active = month.executionCount > 0;
            const barH = active
              ? Math.max(12, Math.round((month.executionCount / maxCount) * 48))
              : 4;
            return (
              <div key={month.key} className="flex flex-col items-stretch gap-2">
                <div
                  className="flex min-h-[56px] flex-col justify-end"
                  aria-hidden={!active}
                >
                  <div
                    className={cn(
                      "w-full border-2 transition-colors",
                      active
                        ? "border-accent bg-accent/80"
                        : "border-border bg-muted",
                    )}
                    style={{ height: barH }}
                  />
                </div>
                <div className="text-center">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">
                    {month.label.replace(/\s/g, "\u00a0")}
                  </p>
                  {active ? (
                    <p className="mt-1 font-mono text-[9px] leading-tight tracking-tight text-muted-foreground">
                      {month.brandLabels.slice(0, 2).join(" · ")}
                      {month.brandLabels.length > 2
                        ? ` +${month.brandLabels.length - 2}`
                        : ""}
                    </p>
                  ) : (
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground/60">
                      —
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 border-t-2 border-border pt-4 font-mono text-[10px] tracking-tight text-muted-foreground">
          {t("anonymizedNote")}
        </p>
      </div>
    </section>
  );
}
