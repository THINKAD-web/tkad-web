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
      className="mt-12 rounded-2xl border border-navy/10 bg-white p-5 shadow-lg shadow-navy/5 sm:p-7"
    >
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="media-detail-performance-heading"
          className="text-xl font-bold tracking-tight text-navy sm:text-2xl"
        >
          {t("performanceTitle")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("performanceDisclaimer")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
        <div className="rounded-xl border border-navy/8 bg-gradient-to-br from-slate-50 to-white px-5 py-6 sm:px-6 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("performanceStatMonthly")}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-navy whitespace-nowrap sm:text-3xl">
            {format.number(metrics.monthlyImpressions)}
          </p>
        </div>
        <div className="rounded-xl border border-navy/8 bg-gradient-to-br from-slate-50 to-white px-5 py-6 sm:px-6 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("performanceStatDaily")}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-navy whitespace-nowrap sm:text-3xl">
            {format.number(metrics.dailyFootfall)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("performanceDonutTitle")}
          </p>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
            <div
              className="relative h-40 w-40 shrink-0 rounded-full shadow-inner ring-4 ring-white"
              style={{ background: gradient }}
              role="img"
              aria-label={t("performanceDonutTitle")}
            >
              <div className="absolute inset-[24%] rounded-full bg-white shadow-sm" />
            </div>
            <ul className="w-full max-w-xs space-y-2.5 text-sm">
              {metrics.donut.map((seg) => (
                <li
                  key={seg.key}
                  className="flex items-center justify-between gap-3 border-b border-navy/5 pb-2 last:border-0 last:pb-0"
                >
                  <span className="flex items-center gap-2 text-navy/85">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden
                    />
                    {t(DONUT_LABEL_KEYS[seg.key])}
                  </span>
                  <span className="font-semibold tabular-nums text-navy">
                    {seg.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("performanceBarsTitle")}
          </p>
          <ul className="space-y-5">
            {metrics.bars.map((row) => (
              <li key={row.key}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-navy">
                    {t(BAR_LABEL_KEYS[row.key])}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-navy">
                    {row.value}
                  </span>
                </div>
                <div
                  className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={row.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t(BAR_LABEL_KEYS[row.key])}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy via-navy-light to-gold-dark transition-[width] duration-500"
                    style={{ width: `${row.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-gold-dark/25 bg-gradient-to-br from-gold-light/25 via-white to-slate-50 px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/70">
            {t("performanceVisibilityTitle")}
          </p>
          {visibilityBadge ? (
            <span
              className={
                metrics.visibilityScore >= 90
                  ? "rounded-full border-2 border-gold-dark/55 bg-gradient-to-r from-gold via-gold-light to-gold-dark px-3.5 py-1.5 text-[11px] font-extrabold tracking-wide text-navy shadow-md shadow-gold-dark/25"
                  : "rounded-full border border-gold-dark/40 bg-gradient-to-r from-gold/35 to-gold-dark/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-navy shadow-sm"
              }
            >
              {visibilityBadge}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-navy sm:text-5xl">
            {metrics.visibilityScore}
          </span>
          <span className="mb-1.5 text-lg font-medium text-muted-foreground">
            /100
          </span>
        </div>
        <div
          className="mt-4 h-4 w-full overflow-hidden rounded-full bg-white/80 shadow-inner ring-1 ring-navy/10"
          role="progressbar"
          aria-valuenow={metrics.visibilityScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("performanceVisibilityTitle")}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-navy via-navy-light to-gold-dark shadow-sm"
            style={{ width: `${metrics.visibilityScore}%` }}
          />
        </div>
      </div>

      <p className="mt-8 rounded-xl border border-navy/10 bg-gradient-to-br from-slate-50/90 to-white px-5 py-4 text-sm font-medium leading-relaxed text-navy/90 sm:px-6">
        {compareNote}
      </p>
    </section>
  );
}
