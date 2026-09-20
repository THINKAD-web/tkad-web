"use client";

import { useTranslations } from "next-intl";
import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";
import type { MediaPriceBenchmark } from "@/lib/media-price-transparency";
import { formatManWon } from "@/lib/media-price-transparency";
import { TrendingDown, TrendingUp } from "lucide-react";
import { RegionPriceAlertToggle } from "@/components/media-detail/region-price-alert-toggle";

export function MediaPriceTransparencyCard({
  benchmark,
  locale,
}: {
  benchmark: MediaPriceBenchmark;
  locale: string;
}) {
  const t = useTranslations("mediaDetail.priceTransparency");
  const bucket = normalizeMediaDetailTextLocale(locale);
  const absPct = Math.abs(benchmark.percentVsAvg);
  const zoneLabel =
    bucket === "ko" ? benchmark.zoneLabelKo : benchmark.zoneLabelEn;

  return (
    <section
      className="mt-6 rounded-2xl border-2 border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent-soft)] p-5 sm:p-6"
      aria-labelledby="price-transparency-heading"
    >
      <p
        id="price-transparency-heading"
        className="tkad-type-label text-[color:var(--qp-accent)] dark:text-[color:var(--qp-accent)]/90"
      >
        {t("eyebrow")}
      </p>
      <h3 className="mt-2 text-[length:var(--qp-text-h3)] font-bold tracking-tight text-foreground">
        {t("title")}
      </h3>
      <ul className="mt-4 space-y-3 text-sm text-foreground">
        <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
          <span className="text-muted-foreground">
            {t("zoneAverage", { zone: zoneLabel })}
          </span>
          <span className="font-display font-bold tabular-nums">
            {bucket === "ko" ? t("monthPrefix") : null}
            {formatManWon(benchmark.regionAvgWon, locale)}
          </span>
        </li>
        <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
          <span className="text-muted-foreground">{t("thisMedia")}</span>
          <span className="flex items-center gap-2 font-display font-bold tabular-nums">
            {formatManWon(benchmark.mediaPriceWon, locale)}
            {benchmark.cheaperThanAvg ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                {t("belowAvg", { pct: absPct })}
              </span>
            ) : benchmark.percentVsAvg > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-200">
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                {t("aboveAvg", { pct: absPct })}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("nearAverage")}
              </span>
            )}
          </span>
        </li>
        <li className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted-foreground">{t("similarRange")}</span>
          <span className="text-sm font-semibold tabular-nums">
            {formatManWon(benchmark.similarMinWon, locale)} {" ~ "}
            {formatManWon(benchmark.similarMaxWon, locale)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({benchmark.similarCount}
              {bucket === "ko" ? t("placesSuffix") : ""})
            </span>
          </span>
        </li>
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {t("negotiationHint", { pct: benchmark.negotiationHintPct })}
      </p>
      {benchmark.zoneId ? (
        <RegionPriceAlertToggle
          regionZone={benchmark.zoneId}
          zoneLabel={zoneLabel}
          locale={locale}
        />
      ) : null}
    </section>
  );
}
