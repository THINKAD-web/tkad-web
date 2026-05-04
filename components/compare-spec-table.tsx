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
      {
        key: "availability",
        label: t("compareRowAvailability"),
        cell: (m) => {
          if (m.availability === "available") return t("compareAvailabilityAvailable");
          if (m.availability === "reserved") return t("compareAvailabilityReserved");
          if (m.availability === "maintenance") return t("compareAvailabilityMaintenance");
          return "—";
        },
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

  const colStripe = (i: number) =>
    i % 3 === 0
      ? "bg-accent"
      : i % 3 === 1
        ? "bg-hero-void"
        : "bg-card ring-1 ring-border/20";

  return (
    <div className="mt-10 border-2 border-border bg-card md:mt-12">
      <div className="border-b-2 border-border bg-hero-void px-3 py-3 sm:px-4 sm:py-4">
        <h2 className="text-base font-bold tracking-tight text-hero-fg sm:text-lg">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
            {`[ ${isKo ? "지표" : "METRICS"} ] `}
          </span>
          {t("compareSpecTitle")}
        </h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-hero-fg/65 sm:text-xs">
          {t("compareSpecHint")}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[min(100%,42rem)] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[7.5rem] border-b-2 border-r-2 border-border bg-muted px-2 py-2.5 sm:min-w-[9.5rem] sm:px-3"
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("compareColMetric")}
                </span>
              </th>
              {items.map((m, idx) => (
                <th
                  key={m.id}
                  scope="col"
                  className="min-w-[8.5rem] max-w-[14rem] border-b-2 border-border px-2 py-2.5 align-bottom sm:min-w-[10.5rem] sm:px-3"
                >
                  <div
                    className={`mb-1.5 h-1.5 w-full border border-border/10 ${colStripe(idx)}`}
                    aria-hidden
                  />
                  <Link
                    href={mediaItemDetailPath(m.id)}
                    className="line-clamp-2 text-left text-[11px] font-bold leading-snug text-foreground underline decoration-accent decoration-1 underline-offset-2 hover:text-accent sm:text-xs"
                  >
                    {isKo ? m.name : (m.nameEn || m.name)}
                  </Link>
                  <Link
                    href={`/planner?addMedia=${encodeURIComponent(m.id)}`}
                    className="mt-1.5 inline-flex max-w-full items-center gap-1 border border-border/15 bg-muted px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-foreground hover:border-accent hover:bg-accent/10"
                    aria-label={t("compareStartPlanner")}
                  >
                    <span aria-hidden>▸</span> {t("compareStartPlanner")}
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
                className={rowIdx % 2 === 0 ? "bg-card" : "bg-muted/80"}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 max-w-[10rem] border-b-2 border-r-2 border-border px-2 py-2.5 text-left text-[10px] font-bold leading-snug sm:max-w-[12rem] sm:px-3 sm:text-xs ${
                    row.key === "price"
                      ? "bg-accent/15 text-foreground"
                      : "text-foreground/80"
                  } ${rowIdx % 2 === 0 ? "bg-muted" : "bg-muted"}`}
                >
                  {row.label}
                  {row.better && (
                    <span className="ml-1 text-[9px] font-mono text-muted-foreground">
                      {row.better === "higher" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
                {items.map((m, idx) => {
                  const isBest = bestIdx === idx;
                  return (
                  <td
                    key={`${row.key}-${m.id}`}
                    className={`max-w-[16rem] border-b-2 border-border/10 px-2 py-2.5 text-[11px] sm:px-3 sm:text-sm ${
                      isBest
                        ? "bg-accent/12 font-bold text-foreground"
                        : row.key === "price"
                          ? "font-bold text-foreground"
                          : "text-foreground/85"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-1">
                      <span className="line-clamp-4 min-w-0 break-words tabular-nums">
                        {row.cell(m)}
                      </span>
                      {isBest && (
                        <span className="shrink-0 border border-accent bg-accent px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide text-accent-foreground">
                          {row.better === "higher"
                            ? (isKo ? "최고" : "Best")
                            : (isKo ? "최저" : "Best")}
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
