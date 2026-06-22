"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { highlightReportScanText } from "@/components/planner/report-scan-text";
import { Target, Wallet, CalendarRange, MapPin, Layers, Users, Briefcase } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import { DEFAULT_LOGO_PLACEMENT } from "@/components/planner/composite-preview";
import { aggregatePortfolioTraffic } from "@/lib/portfolio-traffic";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  formatBudgetManwon,
  formatCatalogPriceFieldWon,
  formatCpmKrw,
  formatMediaPrice,
  formatPricePeriodShortLabel,
  normalizeMediaPricePeriod,
} from "@/lib/media-price-format";
import {
  PlannerNeonLabel,
  plannerNeon,
} from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

export type PlannerReportPreviewBudgetSlice = {
  label: string;
  pct: number;
  valueWon: number;
  actualWon?: number;
};

type Props = {
  isKo: boolean;
  goalTitle: string;
  budgetNum: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  portfolio: MediaItem[];
  metrics: PlannerMetrics | null;
  reachCorePct: number;
  reachExtendedPct: number;
  budgetAllocation: PlannerReportPreviewBudgetSlice[];
  blendedCpmKrw: number | null;
  effectSummaryLines: string[];
  generatedAt: string;
  /** PR-9: PDF에 합성 로고 이미지 포함 */
  logoUrl?: string | null;
  mediaPlacements?: Record<string, CompositeLogoPlacement>;
};

function thumbUrl(m: MediaItem): string | null {
  return getPrimaryMediaImageUrl(m) ?? resolveMediaGallery(m)[0] ?? null;
}

const PlannerReportPreview = forwardRef<HTMLDivElement, Props>(
  function PlannerReportPreview(
    {
  isKo,
  goalTitle,
  budgetNum,
  periodDisplay,
  regionsText,
  categoriesText,
  ageText,
  industryText,
  portfolio,
  metrics,
  reachCorePct,
  reachExtendedPct,
  budgetAllocation,
  blendedCpmKrw,
  effectSummaryLines,
  generatedAt,
  logoUrl,
  mediaPlacements,
}: Props,
  ref,
) {
  const tm = useTranslations("media");
  const t = useTranslations("planner");

  const priceOptionBadge = (m: MediaItem): string | null => {
    const opts = m.priceOptions ?? [];
    if (opts.length === 0) return null;
    const periods = Array.from(
      new Set(opts.map((o) => normalizeMediaPricePeriod(o.period))),
    );
    const hasNonMonth = periods.some((p) => p !== "month");
    if (!hasNonMonth) return null;
    const labels = periods.map((p) => formatPricePeriodShortLabel(p, isKo ? "ko" : "en"));
    const uniq = Array.from(new Set(labels)).join(" · ");
    return isKo ? `옵션: ${uniq}` : `Options: ${uniq}`;
  };

  const typeLabel = (m: MediaItem) => {
    const ty = m.type;
    if (
      ty === "digital" ||
      ty === "static" ||
      ty === "mobile" ||
      ty === "network"
    ) {
      return tm(`types.${ty}`);
    }
    return ty;
  };

  return (
    <div
      ref={ref}
      id="planner-report-content"
      className={cn(
        "box-border w-full max-w-[240mm] space-y-8 rounded-2xl border p-4 antialiased sm:p-6",
        "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white text-foreground",
      )}
    >
      <div className="tkad-planner-dark-surface rounded-xl bg-gradient-to-br from-violet-950/90 via-[#0a0a12] to-cyan-950/80 p-7 text-white sm:p-10">
        <PlannerNeonLabel className="!text-cyan-400/80">Thinkad Planner</PlannerNeonLabel>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t("reportPdfTitle")}
        </h3>
        <p className="mt-2 text-xs uppercase tracking-widest text-white/60">
          {generatedAt}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <Target className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelGoal")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{goalTitle}</dd>
          </div>
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelBudget")}
            </dt>
            <dd className="mt-1 font-display text-sm font-bold tabular-nums">
              {formatBudgetManwon(budgetNum, isKo ? "ko" : "en")}
              {isKo ? " (총)" : " total"}
            </dd>
          </div>
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <CalendarRange className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelPeriod")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{periodDisplay}</dd>
          </div>
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelRegions")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{regionsText}</dd>
          </div>
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelCategories")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{categoriesText}</dd>
          </div>
          <div>
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelAge")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{ageText}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className={cn("flex items-center gap-2", plannerNeon.label)}>
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelIndustry")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{industryText}</dd>
          </div>
        </dl>
      </div>

      <section>
        <PlannerNeonLabel className="mb-4 block">
          {t("reportSectionMedia")}
        </PlannerNeonLabel>
        {portfolio.length === 0 ? (
          <p
            className={cn(
              "rounded-xl border px-4 py-8 text-center text-sm",
              "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50",
              plannerNeon.subtext,
            )}
          >
            {t("reportPreviewNoMedia")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((m) => {
              const src = thumbUrl(m);
              const name = isKo ? m.name : (m.nameEn || m.name) || m.name;
              const loc = isKo ? m.location : (m.locationEn || m.location) || m.location;
              return (
                <li
                  key={m.id}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3",
                    "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
                  )}
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg border dark:border-white/10 border-gray-200 dark:bg-white/10 bg-gray-100">
                    {src ? (
                      // html2canvas(PDF)는 object-fit 을 무시해 <img> 를 늘려 비율을
                      // 깨뜨린다. background-size:cover 의 div 로 렌더해 비율을 보존.
                      <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url("${src}")`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                        {t("reportPreviewNoImage")}
                      </div>
                    )}
                    {logoUrl && src ? (() => {
                      const p =
                        mediaPlacements?.[m.id] ?? DEFAULT_LOGO_PLACEMENT;
                      const scale = 1.18;
                      return (
                        <div
                          className="pointer-events-none absolute flex items-start justify-center"
                          style={{
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            width: `${Math.min(92, p.widthPct * scale)}%`,
                            transform: `translate(-50%, -50%) rotate(${p.rotationDeg ?? 0}deg)`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-full object-contain drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]"
                          />
                        </div>
                      );
                    })() : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-foreground">
                      {name}
                    </p>
                    <p className={cn("mt-1 line-clamp-2 text-[11px] leading-relaxed", plannerNeon.subtext)}>
                      {loc}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-violet-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-300">
                      {typeLabel(m)}
                    </span>
                    <div className="my-2 border-t dark:border-white/10 border-gray-200" />
                    <p className="text-sm font-bold tabular-nums text-violet-500 dark:text-violet-400">
                      {formatCatalogPriceFieldWon(m.price, isKo ? "ko" : "en")}
                      <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground">
                        /{formatPricePeriodShortLabel(m.pricePeriod, isKo ? "ko" : "en")}
                      </span>
                    </p>
                    <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                    {(() => {
                      const badge = priceOptionBadge(m);
                      if (!badge) return null;
                      return (
                        <p className={cn("mt-1 text-[10px] font-medium", plannerNeon.kpiLabel)}>
                          {badge}
                        </p>
                      );
                    })()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {metrics ? (
        <section>
          <PlannerNeonLabel className="mb-4 block">
            {t("reportSectionEffect")}
          </PlannerNeonLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={plannerNeon.kpiCard}>
              <p className={plannerNeon.kpiLabel}>{t("reportLabelMonthlyImp")}</p>
              <p className={cn("mt-2 text-lg font-bold tabular-nums", plannerNeon.kpiValue)}>
                {metrics.estimatedMonthlyImpressions.toLocaleString()}
              </p>
            </div>
            <div className={plannerNeon.kpiCard}>
              <p className={plannerNeon.kpiLabel}>{t("reportLabelTotalImp")}</p>
              <p className={cn("mt-2 text-lg font-bold tabular-nums", plannerNeon.kpiValue)}>
                {metrics.estimatedTotalImpressions.toLocaleString()}
              </p>
            </div>
            <div className={plannerNeon.kpiCard}>
              <p className={plannerNeon.kpiLabel}>{t("reportLabelReachCore")}</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-violet-400">
                {reachCorePct}%
              </p>
            </div>
            <div className={plannerNeon.kpiCard}>
              <p className={plannerNeon.kpiLabel}>{t("reportLabelReachExtended")}</p>
              <p className="mt-2 text-lg font-bold tabular-nums text-cyan-400">
                {reachExtendedPct}%
              </p>
            </div>
            {blendedCpmKrw != null ? (
              <div className={plannerNeon.kpiCard}>
                <p className={plannerNeon.kpiLabel}>{t("reportLabelCpm")}</p>
                <p className={cn("mt-2 text-lg font-bold tabular-nums", plannerNeon.kpiValue)}>
                  {formatCpmKrw(blendedCpmKrw, isKo ? "ko" : "en")}
                </p>
              </div>
            ) : null}
            <div
              className={cn(
                plannerNeon.kpiCard,
                "bg-gradient-to-br from-violet-500/20 to-cyan-400/10 sm:col-span-2",
              )}
            >
              <p className={plannerNeon.kpiLabel}>{t("reportLabelRoiExpected")}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-violet-300">
                {metrics.roiExpected}
                {t("roiUnit")}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {portfolio.length > 0 ? (
        <PortfolioTrafficSection portfolio={portfolio} isKo={isKo} />
      ) : null}

      <section>
        <PlannerNeonLabel className="mb-4 block">
          {t("reportSectionBudgetAllocation")}
        </PlannerNeonLabel>
        <p className={cn("mb-4 text-sm", plannerNeon.subtext)}>
          {t("reportBudgetAllocationIntro")}
        </p>
        {budgetAllocation.length === 0 ? (
          <p className={plannerNeon.subtext}>—</p>
        ) : (
          <ul className="space-y-4">
            {budgetAllocation.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className={cn("font-bold", plannerNeon.headline)}>
                    {row.label}
                  </span>
                  <span className={cn("tabular-nums", plannerNeon.subtext)}>
                    {row.pct}%
                    {row.actualWon != null && row.actualWon > 0
                      ? ` · ${formatMediaPrice(row.actualWon, isKo ? "ko" : "en")}${isKo ? "/월" : "/mo"}`
                      : isKo
                        ? " · 단가 문의"
                        : " · Price on request"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full dark:bg-white/10 bg-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
                    style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className={cn(
          "rounded-xl border p-5 sm:p-6",
          "dark:border-violet-500/30 border-violet-200 dark:bg-violet-500/10 bg-violet-50",
        )}
      >
        <PlannerNeonLabel>{t("reportSectionEffectSummary")}</PlannerNeonLabel>
        <p className={cn("mt-1 text-sm", plannerNeon.subtext)}>
          {t("reportEffectSummaryIntro")}
        </p>
        <ul className="mt-4 space-y-2.5 text-sm">
          {effectSummaryLines.map((line, i) => (
            <li key={i} className="flex gap-2 rounded-lg bg-white/50 px-3 py-2 dark:bg-white/5">
              <span className="font-bold text-violet-400">·</span>
              <span className={cn("min-w-0 leading-relaxed", plannerNeon.headline)}>
                {highlightReportScanText(line)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
},
);

export default PlannerReportPreview;

const HOUR_LABELS = ["0", "3", "6", "9", "12", "15", "18", "21"];
const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

/** 포트폴리오 합산 시간대·요일·월별 유동 패턴 — 매체 상세와 동일 데이터 소스(추정·실측 혼합) */
function PortfolioTrafficSection({
  portfolio,
  isKo,
}: {
  portfolio: MediaItem[];
  isKo: boolean;
}) {
  const agg = aggregatePortfolioTraffic(
    portfolio.map((m) => ({
      type: m.type,
      region: m.region,
      dailyFootTraffic: m.dailyFootTraffic,
      trafficPattern: m.trafficPattern ?? null,
    })),
  );

  const peakHour = indexOfMax(agg.hourly);
  const peakDay = indexOfMax(agg.weekly);
  const peakMonth = indexOfMax(agg.monthly);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <PlannerNeonLabel>
          {isKo ? "노출 패턴 (시간대 · 요일 · 월별)" : "Exposure pattern (hourly · weekday · monthly)"}
        </PlannerNeonLabel>
        {!agg.allReal ? (
          <span className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-violet-400">
            {isKo ? "일부 추정치" : "partly estimated"}
          </span>
        ) : null}
      </div>
      <p className={cn("mb-4 text-sm", plannerNeon.subtext)}>
        {isKo
          ? "매체 상세의 일유동 데이터(또는 매체유형·지역 기반 추정)를 가중평균한 캠페인 전체의 노출 패턴입니다."
          : "Aggregated exposure pattern across the campaign, weighted by daily footfall."}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <TrafficBarBlock
          title={isKo ? "시간대 (24h)" : "Hourly"}
          values={agg.hourly}
          labels={Array.from({ length: 24 }, (_, i) =>
            HOUR_LABELS.includes(String(i)) ? String(i) : "",
          )}
          peakIdx={peakHour}
          peakLabel={
            isKo ? `피크 ${peakHour}시` : `Peak ${peakHour}:00`
          }
        />
        <TrafficBarBlock
          title={isKo ? "요일" : "Weekday"}
          values={agg.weekly}
          labels={isKo ? [...WEEKDAY_KO] : [...WEEKDAY_EN]}
          peakIdx={peakDay}
          peakLabel={
            isKo
              ? `피크 ${WEEKDAY_KO[peakDay]}요일`
              : `Peak ${WEEKDAY_EN[peakDay]}`
          }
        />
        <TrafficBarBlock
          title={isKo ? "월별 (1~12월)" : "Monthly"}
          values={agg.monthly}
          labels={MONTH_LABELS}
          peakIdx={peakMonth}
          peakLabel={
            isKo
              ? `피크 ${MONTH_LABELS[peakMonth]}월`
              : `Peak ${MONTH_LABELS[peakMonth]}`
          }
        />
      </div>
    </section>
  );
}

function indexOfMax(arr: number[]): number {
  let idx = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[idx]) idx = i;
  return idx;
}

/** html2canvas 호환 — SVG 대신 div 높이로 막대 표시 */
function TrafficBarBlock({
  title,
  values,
  labels,
  peakIdx,
  peakLabel,
}: {
  title: string;
  values: number[];
  labels: string[];
  peakIdx: number;
  peakLabel: string;
}) {
  const max = Math.max(...values, 0.0001);
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-white",
      )}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className={cn("text-xs font-semibold uppercase tracking-widest", plannerNeon.label)}>
          {title}
        </p>
        <span className="rounded-md bg-gradient-to-r from-violet-500 to-cyan-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
          {peakLabel}
        </span>
      </div>
      <div className="flex h-20 items-end gap-[2px]">
        {values.map((v, i) => {
          const h = (v / max) * 100;
          const isPeak = i === peakIdx;
          return (
            <div
              key={i}
              className="relative flex-1"
              style={{ height: `${Math.max(2, h)}%` }}
            >
              <div
                className={`absolute inset-0 ${
                  isPeak ? "bg-primary" : "bg-hero-void"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex h-3 gap-[2px]">
        {labels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-center font-display text-[8px] font-bold leading-tight tracking-[0.18em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
