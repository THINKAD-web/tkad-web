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

  // 모든 열이 "—" 인 행은 숨겨서 의미 없는 줄과 빈 공간을 줄입니다.
  const visibleRows = rows.filter((row) =>
    items.some((m) => row.cell(m) !== "—"),
  );

  return (
    <div className="mt-12 overflow-hidden rounded-2xl border border-navy/15 bg-white shadow-lg md:mt-14">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-navy to-[#0c1a42] px-4 py-4 md:px-6">
        <h2 className="text-lg font-bold text-white md:text-xl">
          {t("compareSpecTitle")}
        </h2>
        <p className="mt-1 text-xs text-slate-300 md:text-sm">
          {t("compareSpecHint")}
        </p>
      </div>

      <div className="-mx-0 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-navy/5">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[8.5rem] border-b border-r border-navy/10 bg-navy/5 px-4 py-3 text-xs font-bold uppercase tracking-wide text-navy/60 sm:min-w-[10rem]"
              >
                {t("compareColMetric")}
              </th>
              {items.map((m, idx) => (
                <th
                  key={m.id}
                  scope="col"
                  className="min-w-[9.5rem] max-w-[16rem] border-b border-navy/10 px-4 py-3 align-bottom sm:min-w-[11rem]"
                >
                  <div className={`mb-1 h-1 rounded-full ${idx === 0 ? "bg-gold" : idx === 1 ? "bg-emerald-400" : "bg-sky-400"}`} />
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
            {visibleRows.map((row, rowIdx) => (
              <tr
                key={row.key}
                className={`transition-colors ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${row.key === "price" ? "font-semibold" : ""}`}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 whitespace-nowrap border-r border-navy/10 px-4 py-3 text-xs font-semibold shadow-[4px_0_8px_-4px_rgba(26,42,108,0.08)] sm:text-sm ${row.key === "price" ? "bg-gold/5 text-navy" : rowIdx % 2 === 0 ? "bg-white text-navy/70" : "bg-slate-50/60 text-navy/70"}`}
                >
                  {row.label}
                </th>
                {items.map((m, idx) => (
                  <td
                    key={`${row.key}-${m.id}`}
                    className={`max-w-[16rem] px-4 py-3 text-xs tabular-nums sm:text-sm ${row.key === "price" ? "font-bold text-navy" : "text-navy/80"}`}
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
