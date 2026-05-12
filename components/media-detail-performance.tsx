"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  donutConicGradient,
  type MediaPerformanceMetrics,
  type PerformanceBarKey,
  type PerformanceDonutKey,
} from "@/lib/media-performance";

const DONUT_LABEL_KEYS: Record<PerformanceDonutKey, string> = {
  peak: "performanceDonutPeak",
  standard: "performanceDonutStandard",
  extended: "performanceDonutExtended",
};

const BAR_LABEL_KEYS: Record<PerformanceBarKey, string> = {
  reach: "performanceBarReach",
  dwell: "performanceBarDwell",
  recall: "performanceBarRecall",
};

export default function MediaDetailPerformance({
  metrics,
}: {
  metrics: MediaPerformanceMetrics;
}) {
  const t = useTranslations("media.detail");
  const format = useFormatter();
  const gradient = donutConicGradient(metrics.donut);
  /** 고정 문구(번역) — 숫자 보간 없이 자연스러운 안내 문장 */
  const compareNote = t("performanceAverageCompare");
  const visibilityBadge =
    metrics.visibilityScore >= 90
      ? t("performanceVisibilityBadgeTopTier")
      : metrics.visibilityScore >= 80
        ? t("performanceVisibilityBadgeGood")
        : null;

  return (
    <section
      aria-labelledby="media-detail-performance-heading"
      className="mt-12 rounded-[28px] border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8"
    >
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ PERFORMANCE METRICS ]
          </p>
          <h2
            id="media-detail-performance-heading"
            className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {t("performanceTitle")}
          </h2>
        </div>
        <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
          {t("performanceDisclaimer")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
        <div className="-mt-[2px] -ml-[2px] rounded-[22px] border border-border/80 bg-muted/40 px-6 py-7 shadow-xs backdrop-blur">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {t("performanceStatMonthly")} ]
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground whitespace-nowrap sm:text-4xl">
            {format.number(metrics.monthlyImpressions)}
          </p>
        </div>
        <div className="-mt-[2px] -ml-[2px] rounded-[22px] border border-border/80 bg-muted/40 px-6 py-7 shadow-xs backdrop-blur">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {t("performanceStatDaily")} ]
          </p>
          <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground whitespace-nowrap sm:text-4xl">
            {format.number(metrics.dailyFootfall)}
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {t("performanceDonutTitle")} ]
          </p>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <div
              className="relative h-40 w-40 shrink-0"
              style={{ background: gradient }}
              role="img"
              aria-label={t("performanceDonutTitle")}
            >
              <div className="absolute inset-[24%] border-2 border-border bg-card" />
            </div>
            <ul className="w-full max-w-xs space-y-3 text-sm">
              {metrics.donut.map((seg) => (
                <li
                  key={seg.key}
                  className="flex items-center justify-between gap-3 border-b-2 border-border pb-2 last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <span
                      className="h-3 w-3 shrink-0"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                      {t(DONUT_LABEL_KEYS[seg.key])}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {seg.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            [ {t("performanceBarsTitle")} ]
          </p>
          <ul className="space-y-5">
            {metrics.bars.map((row) => (
              <li key={row.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                    {t(BAR_LABEL_KEYS[row.key])}
                  </span>
                  <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                    {row.value}
                  </span>
                </div>
                <div
                  className="h-3 w-full border-2 border-border bg-card"
                  role="progressbar"
                  aria-valuenow={row.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(BAR_LABEL_KEYS[row.key])}
                >
                  <div
                    className="h-full bg-accent transition-[width] duration-500"
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-[24px] border border-border/80 bg-muted/30 px-6 py-7 text-foreground shadow-xs backdrop-blur sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            [ {t("performanceVisibilityTitle")} ]
          </p>
          {visibilityBadge ? (
            <span
              className={
                metrics.visibilityScore >= 90
                  ? "rounded-xl border border-accent bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent-foreground"
                  : "rounded-xl border border-border/80 bg-card/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-foreground shadow-xs backdrop-blur"
              }
            >
              {visibilityBadge}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <span className="text-5xl font-bold tabular-nums tracking-tight text-accent sm:text-6xl">
            {metrics.visibilityScore}
          </span>
          <span className="mb-2 font-mono text-sm uppercase tracking-[0.18em] text-hero-fg/60">
            / 100
          </span>
        </div>
        <div
          className="mt-4 h-4 w-full overflow-hidden rounded-full border border-border/80 bg-card/60"
          role="progressbar"
          aria-valuenow={metrics.visibilityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("performanceVisibilityTitle")}
        >
          <div
            className="h-full bg-accent"
            style={{ width: `${metrics.visibilityScore}%` }}
          />
        </div>
      </div>

      <p className="mt-8 rounded-[22px] border border-border/80 bg-muted/40 px-5 py-4 text-sm font-medium leading-relaxed text-foreground shadow-xs backdrop-blur sm:px-6">
        <span className="mr-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {`// NOTE`}
        </span>
        {compareNote}
      </p>
    </section>
  );
}
