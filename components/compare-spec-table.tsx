"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { MediaItem } from "@/lib/media-data";
import {
  estimatedCpmWon,
  estimatedMonthlyImpressions,
} from "@/lib/ai-recommend-metrics";
import {
  effectiveHeightM,
  effectiveWidthM,
} from "@/lib/media-filter-advanced";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";

const KNOWN_REGION_CODES = new Set([
  "seoul",
  "busan",
  "jeju",
  "national",
]);

function formatDimM(n: number): string {
  const s = n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
  return s.replace(/\.0$/, "");
}

function formatSizeDisplay(m: MediaItem): string {
  const w = effectiveWidthM(m);
  const h = effectiveHeightM(m);
  if (w != null && h != null) {
    return `${formatDimM(w)}×${formatDimM(h)} m`;
  }
  const raw = m.size?.trim();
  return raw && raw.length > 0 ? raw : "—";
}

function formatCpmDisplay(m: MediaItem, locale: string): string {
  const fromDb = m.cpm;
  if (typeof fromDb === "number" && Number.isFinite(fromDb) && fromDb > 0) {
    return `₩${Math.round(fromDb).toLocaleString(locale)}`;
  }
  const est = estimatedCpmWon(m);
  if (est != null && Number.isFinite(est) && est > 0) {
    return `₩${Math.round(est).toLocaleString(locale)}`;
  }
  return "—";
}

function regionLabel(m: MediaItem, t: (key: string) => string): string {
  if (KNOWN_REGION_CODES.has(m.region)) {
    return t(`regions.${m.region}`);
  }
  return m.region;
}

export function CompareSpecTable({
  items,
  isKo,
}: {
  items: MediaItem[];
  isKo: boolean;
}) {
  const t = useTranslations("media");
  const locale = isKo ? "ko-KR" : "en-US";

  const rows: { key: string; label: string; cell: (m: MediaItem) => string }[] =
    [
      {
        key: "price",
        label: t("compareRowPrice"),
        cell: (m) =>
          `${formatMediaPriceWonWithSymbol(m.price, locale)} · ${t(
            mediaPricePeriodTranslationKey(m.pricePeriod),
          )}`,
      },
      {
        key: "size",
        label: t("compareRowSize"),
        cell: (m) => formatSizeDisplay(m),
      },
      {
        key: "foot",
        label: t("compareRowDailyFoot"),
        cell: (m) =>
          typeof m.dailyFootTraffic === "number" && m.dailyFootTraffic > 0
            ? m.dailyFootTraffic.toLocaleString(locale)
            : "—",
      },
      {
        key: "impressions",
        label: t("compareRowImpressions"),
        cell: (m) => {
          const n = estimatedMonthlyImpressions(m);
          return n > 0
            ? `${n.toLocaleString(locale)}${t("compareImpressionsSuffix")}`
            : "—";
        },
      },
      {
        key: "cpm",
        label: t("compareRowCpm"),
        cell: (m) => formatCpmDisplay(m, locale),
      },
      {
        key: "visibility",
        label: t("compareRowVisibility"),
        cell: (m) =>
          m.visibilityScore != null
            ? `${m.visibilityScore}${isKo ? "점" : "/100"}`
            : "—",
      },
      {
        key: "targetAge",
        label: t("compareRowTargetAge"),
        cell: (m) => {
          const v = m.targetAge?.trim();
          return v && v.length > 0 ? v : "—";
        },
      },
      {
        key: "region",
        label: t("compareRowRegion"),
        cell: (m) => regionLabel(m, t),
      },
    ];

  return (
    <div className="mt-12 border-t border-navy/10 pt-10 md:mt-14 md:pt-12">
      <h2 className="mb-4 text-lg font-bold text-navy md:text-xl">
        {t("compareSpecTitle")}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground md:text-sm">
        {t("compareSpecHint")}
      </p>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/15 bg-slate-50/90">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[8.5rem] border-r border-navy/10 bg-slate-50/95 px-3 py-3 text-xs font-bold uppercase tracking-wide text-navy/70 backdrop-blur-sm sm:min-w-[10rem] sm:px-4"
              >
                {t("compareColMetric")}
              </th>
              {items.map((m) => (
                <th
                  key={m.id}
                  scope="col"
                  className="min-w-[9.5rem] max-w-[16rem] border-b border-navy/15 px-3 py-3 align-bottom sm:min-w-[11rem] sm:px-4"
                >
                  <Link
                    href={mediaItemDetailPath(m.id)}
                    className="line-clamp-2 text-left text-xs font-bold leading-snug text-navy underline-offset-2 hover:text-gold-dark hover:underline sm:text-sm"
                  >
                    {isKo ? m.name : m.nameEn}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-navy/8 transition-colors hover:bg-slate-50/60"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 whitespace-nowrap border-r border-navy/10 bg-white/95 px-3 py-2.5 text-xs font-semibold text-navy shadow-[4px_0_12px_-4px_rgba(26,42,108,0.12)] backdrop-blur-sm sm:px-4 sm:text-sm"
                >
                  {row.label}
                </th>
                {items.map((m) => (
                  <td
                    key={`${row.key}-${m.id}`}
                    className="max-w-[16rem] bg-white px-3 py-2.5 text-xs tabular-nums text-navy/90 sm:px-4 sm:text-sm"
                  >
                    <span className="line-clamp-4 break-words">{row.cell(m)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
