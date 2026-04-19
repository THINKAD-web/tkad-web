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

  // 항목별 수치 비교 방향: "higher" = 높을수록 좋음, "lower" = 낮을수록 좋음, null = 비교 없음
  const rows: { key: string; label: string; cell: (m: MediaItem) => string; numVal?: (m: MediaItem) => number | null; better?: "higher" | "lower" }[] =
    [
      {
        key: "price",
        label: t("compareRowPrice"),
        cell: (m) =>
          `${formatMediaPriceWonWithSymbol(m.price, locale)} · ${t(
            mediaPricePeriodTranslationKey(m.pricePeriod),
          )}`,
        numVal: (m) => m.price > 0 ? m.price : null,
        better: "lower",
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
        numVal: (m) => m.dailyFootTraffic ?? null,
        better: "higher",
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
        numVal: (m) => estimatedMonthlyImpressions(m) || null,
        better: "higher",
      },
      {
        key: "cpm",
        label: t("compareRowCpm"),
        cell: (m) => formatCpmDisplay(m, locale),
        numVal: (m) => {
          const fromDb = m.cpm;
          if (typeof fromDb === "number" && fromDb > 0) return fromDb;
          return estimatedCpmWon(m) ?? null;
        },
        better: "lower",
      },
      {
        key: "visibility",
        label: t("compareRowVisibility"),
        cell: (m) =>
          m.visibilityScore != null
            ? `${m.visibilityScore}${isKo ? "점" : "/100"}`
            : "—",
        numVal: (m) => m.visibilityScore ?? null,
        better: "higher",
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

  // 항목별 최고값 인덱스 계산
  function getBestIdx(row: typeof rows[0]): number | null {
    if (!row.numVal || !row.better || items.length < 2) return null;
    const vals = items.map((m) => row.numVal!(m));
    if (vals.every((v) => v === null)) return null;
    let bestIdx = -1;
    let bestVal = row.better === "higher" ? -Infinity : Infinity;
    vals.forEach((v, i) => {
      if (v === null) return;
      if (row.better === "higher" ? v > bestVal : v < bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    // 동점이면 강조 없음
    const winners = vals.filter(v => v === bestVal);
    if (winners.length > 1) return null;
    return bestIdx;
  }

  return (
    <div className="mt-12 overflow-hidden rounded-2xl border border-navy/15 bg-white shadow-lg md:mt-14">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-navy to-[#070e18] px-4 py-4 md:px-6">
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
            {visibleRows.map((row, rowIdx) => {
                const bestIdx = getBestIdx(row);
                return (
              <tr
                key={row.key}
                className={`transition-colors ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"} ${row.key === "price" ? "font-semibold" : ""}`}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 whitespace-nowrap border-r border-navy/10 px-4 py-3 text-xs font-semibold shadow-[4px_0_8px_-4px_rgba(26,42,108,0.08)] sm:text-sm ${row.key === "price" ? "bg-gold/5 text-navy" : rowIdx % 2 === 0 ? "bg-white text-navy/70" : "bg-slate-50/60 text-navy/70"}`}
                >
                  {row.label}
                  {row.better && (
                    <span className="ml-1 text-[9px] text-muted-foreground">
                      {row.better === "higher" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                {items.map((m, idx) => {
                  const isBest = bestIdx === idx;
                  return (
                  <td
                    key={`${row.key}-${m.id}`}
                    className={`max-w-[16rem] px-4 py-3 text-xs tabular-nums sm:text-sm ${
                      isBest
                        ? "bg-emerald-50 font-bold text-emerald-700"
                        : row.key === "price" ? "font-bold text-navy" : "text-navy/80"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="line-clamp-4 break-words">{row.cell(m)}</span>
                      {isBest && (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                          {row.better === "higher" ? "최고" : "최저"}
                        </span>
                      )}
                    </div>
                  </td>
                  );
                })}
              </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
