"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import type { MediaItem } from "@/lib/media-data";
import { typeLabels } from "@/lib/media-data";
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

  /**
   * 각 비교 컬럼 상단을 네온 팔레트로 구분.
   * 랜딩 네온(보라 → 시안 → 핑크)과 동일 톤이라 페이지 톤 통일.
   */
  const COLUMN_STRIPES = [
    "from-[#a855f7] to-[#22d3ee]",
    "from-[#22d3ee] to-[#ec4899]",
    "from-[#ec4899] to-[#a855f7]",
    "from-[#7c3aed] to-[#0ea5e9]",
    "from-[#0ea5e9] to-[#f43f5e]",
    "from-[#f43f5e] to-[#7c3aed]",
  ];

  const totalCols = items.length;

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-[0_18px_60px_rgba(15,23,42,0.08)] md:mt-12">
      <div className="flex flex-col gap-2 border-b-2 border-border bg-hero-void px-3 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-accent">
            {`[ ${isKo ? "지표" : "METRICS"} ]`}
          </p>
          <h2 className="mt-1.5 text-base font-bold tracking-tight text-hero-fg sm:text-lg">
            {t("compareSpecTitle")}
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-hero-fg/65 sm:text-xs">
            {t("compareSpecHint")}
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          <Sparkles className="h-3 w-3" aria-hidden />
          {isKo
            ? `${totalCols}개 매체 · ${visibleRows.length}항목`
            : `${totalCols} media · ${visibleRows.length} rows`}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[min(100%,42rem)] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted">
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-[7.5rem] border-b-2 border-r-2 border-border bg-muted px-2 py-3 align-bottom sm:min-w-[9.5rem] sm:px-3"
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {t("compareColMetric")}
                </span>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  ↑ {isKo ? "높을수록 좋음" : "higher is better"} · ↓ {isKo ? "낮을수록 좋음" : "lower is better"}
                </p>
              </th>
              {items.map((m, idx) => {
                const typeLabel = typeLabels[m.type];
                const stripe = COLUMN_STRIPES[idx % COLUMN_STRIPES.length];
                return (
                  <th
                    key={m.id}
                    scope="col"
                    className="min-w-[9rem] max-w-[14rem] border-b-2 border-border px-2 pt-0 pb-3 align-bottom sm:min-w-[11rem] sm:px-3"
                  >
                    <div
                      className={`-mx-2 mb-3 h-1.5 bg-gradient-to-r sm:-mx-3 ${stripe}`}
                      aria-hidden
                    />
                    <div className="flex items-start gap-2">
                      <MediaCatalogThumbnail
                        media={m}
                        placeholderLabel={t("imagePreparing")}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg sm:h-14 sm:w-14"
                        bottomGradientClassName={null}
                        placeholderSize="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {isKo ? (typeLabel?.ko ?? m.type) : (typeLabel?.en ?? m.type)}
                        </p>
                        <Link
                          href={mediaItemDetailPath(m.id)}
                          className="mt-0.5 block line-clamp-2 text-left text-[12px] font-bold leading-snug text-foreground decoration-accent decoration-1 underline-offset-2 hover:underline hover:text-accent sm:text-[13px]"
                        >
                          {isKo ? m.name : m.nameEn || m.name}
                        </Link>
                        <p className="mt-1 font-mono text-[10px] font-bold tabular-nums leading-tight text-accent sm:text-[11px]">
                          {formatMediaPriceWonWithSymbol(m.price, locale)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/planner?addMedia=${encodeURIComponent(m.id)}`}
                      className="mt-2 inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent hover:bg-accent/10 hover:text-accent"
                      aria-label={t("compareStartPlanner")}
                    >
                      <span aria-hidden>▸</span> {t("compareStartPlanner")}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIdx) => {
              const bestIdx = getBestIdx(row);
              const isPriceRow = row.key === "price";
              return (
                <tr
                  key={row.key}
                  className={rowIdx % 2 === 0 ? "bg-card" : "bg-muted/60"}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 max-w-[10rem] border-b border-r-2 border-border/60 px-2 py-2.5 text-left text-[10px] font-bold leading-snug sm:max-w-[12rem] sm:px-3 sm:text-xs ${
                      isPriceRow
                        ? "bg-accent/12 text-foreground"
                        : "bg-muted text-foreground/80"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {row.label}
                      {row.better ? (
                        <span
                          className={`font-mono text-[9px] ${row.better === "higher" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                          aria-hidden
                        >
                          {row.better === "higher" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  {items.map((m, idx) => {
                    const isBest = bestIdx === idx;
                    const value = row.cell(m);
                    const isEmpty = value === "—";
                    return (
                      <td
                        key={`${row.key}-${m.id}`}
                        className={`max-w-[16rem] border-b border-border/40 px-2 py-2.5 text-[11px] sm:px-3 sm:text-sm ${
                          isBest
                            ? "bg-emerald-500/12 font-bold text-foreground"
                            : isPriceRow
                              ? "font-bold text-foreground"
                              : isEmpty
                                ? "text-muted-foreground/55"
                                : "text-foreground/85"
                        }`}
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="line-clamp-4 min-w-0 break-words tabular-nums">
                            {value}
                          </span>
                          {isBest ? (
                            <span className="shrink-0 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-800 shadow-[0_2px_10px_rgba(16,185,129,0.25)] dark:text-emerald-200">
                              {row.better === "higher"
                                ? isKo
                                  ? "최고"
                                  : "Best"
                                : isKo
                                  ? "최저"
                                  : "Best"}
                            </span>
                          ) : null}
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
