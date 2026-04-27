"use client";

import { forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Target, Wallet, CalendarRange, MapPin, Layers, Users, Briefcase } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl, resolveMediaGallery } from "@/lib/media-data";
import type { PlannerMetrics } from "@/lib/planner-logic";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import { DEFAULT_LOGO_PLACEMENT } from "@/components/planner/composite-preview";
import { aggregatePortfolioTraffic } from "@/lib/portfolio-traffic";
import {
  PlannerImpressionsLineChart,
  PlannerRoiLineChart,
  PlannerDailyReachBarChart,
  PlannerCpmCompareChart,
  PlannerMonthCompareChart,
  PlannerReachDonutChart,
} from "@/components/planner-charts";

export type PlannerReportPreviewBudgetSlice = {
  label: string;
  pct: number;
  valueMan: number;
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
  matchedCount: number;
  monthCompare: { months: number; totalImpressions: number }[];
  cpmBars: { key: string; label: string; value: number }[];
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
      className="box-border w-full max-w-[240mm] space-y-8 border-2 border-bx-black bg-bx-white p-4 text-bx-black antialiased sm:p-6"
    >
      {/* #PLANNER-2: 외곽 보더만 남기고 헤더/그리드 내부 보더 제거 */}
      <div className="bg-bx-black p-6 text-bx-white sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ THINKAD PLANNER ]
        </p>
        <h3 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
          {t("reportPdfTitle")}
        </h3>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-white/65">
          {`// `}
          {generatedAt}
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <Target className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelGoal")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{goalTitle}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelBudget")}
            </dt>
            <dd className="mt-1 font-mono text-sm font-bold tabular-nums">
              {budgetNum.toLocaleString()}
              {isKo ? "만원 (총)" : " ₩10K (total)"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <CalendarRange className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelPeriod")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{periodDisplay}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelRegions")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{regionsText}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelCategories")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{categoriesText}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelAge")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{ageText}</dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              {t("reportLabelIndustry")}
            </dt>
            <dd className="mt-1 text-sm font-bold">{industryText}</dd>
          </div>
        </dl>
      </div>

      <section>
        <h4 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {t("reportSectionMedia")} ]
        </h4>
        {portfolio.length === 0 ? (
          <p className="border-2 border-bx-black bg-bx-off px-4 py-8 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
            {`// `}{t("reportPreviewNoMedia")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((m) => {
              const src = thumbUrl(m);
              const name = isKo ? m.name : (m.nameEn || m.name) || m.name;
              const loc = isKo ? m.location : (m.locationEn || m.location) || m.location;
              return (
                <li
                  key={m.id}
                  className="-mt-[2px] -ml-[2px] flex gap-3 border-2 border-bx-black bg-bx-white p-3"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden border-2 border-bx-black bg-bx-off">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 외부·Cloudinary URL 등 임의 도메인
                      <img
                        src={src}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-[9px] uppercase tracking-[0.18em] text-bx-gray-dim">
                        {t("reportPreviewNoImage")}
                      </div>
                    )}
                    {logoUrl && src ? (() => {
                      const p =
                        mediaPlacements?.[m.id] ?? DEFAULT_LOGO_PLACEMENT;
                      return (
                        <div
                          className="pointer-events-none absolute flex items-start justify-center"
                          style={{
                            left: `${p.xPct}%`,
                            top: `${p.yPct}%`,
                            width: `${p.widthPct}%`,
                            transform: `translate(-50%, -50%) rotate(${p.rotationDeg ?? 0}deg)`,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-full object-contain"
                          />
                        </div>
                      );
                    })() : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold leading-snug tracking-tight text-bx-black">
                      {name}
                    </p>
                    <p className="mt-1 line-clamp-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                      {`// `}{loc}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-bx-gray-dim">
                      [ {typeLabel(m)} ]
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold tabular-nums text-bx-accent">
                      ₩{m.price.toLocaleString()}
                      <span className="ml-1 text-[10px] font-normal uppercase tracking-[0.18em] text-bx-gray-dim">
                        {isKo ? "만/월" : "₩10K/mo"}
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {metrics ? (
        <section>
          <h4 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            [ {t("reportSectionEffect")} ]
          </h4>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4">
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("reportLabelMonthlyImp")} ]
              </p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-black">
                {metrics.estimatedMonthlyImpressions.toLocaleString()}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("reportLabelTotalImp")} ]
              </p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-black">
                {metrics.estimatedTotalImpressions.toLocaleString()}
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("reportLabelReachCore")} ]
              </p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-accent">
                {reachCorePct}%
              </p>
            </div>
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("reportLabelReachExtended")} ]
              </p>
              <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-accent">
                {reachExtendedPct}%
              </p>
            </div>
            {blendedCpmKrw != null ? (
              <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("reportLabelCpm")} ]
                </p>
                <p className="mt-2 font-mono text-lg font-bold tabular-nums text-bx-black">
                  ₩{blendedCpmKrw.toLocaleString()}
                </p>
              </div>
            ) : null}
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-black p-4 text-bx-white sm:col-span-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                [ {t("reportLabelRoiExpected")} ]
              </p>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-accent">
                {metrics.roiExpected}
                {t("roiUnit")}
              </p>
            </div>
          </div>
          {/* 시뮬레이션 상세 — 기존 Effect 섹션 내부 확장 (섹션 추가 X) */}
          <div className="mt-6 grid grid-cols-1 gap-0 lg:grid-cols-2">
            <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white">
              <div className="border-b-2 border-bx-black p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("results")} ]
                </p>
              </div>
              <div className="grid grid-cols-1 gap-0 p-4 sm:grid-cols-2">
                <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {t("matchedMedia")} ]
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                    {matchedCount}
                    <span className="ml-1 text-base text-bx-gray-dim">
                      {t("countUnit")}
                    </span>
                  </p>
                </div>
                <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {t("avgMonthlySlot")} ]
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-bx-black">
                    {Math.round(metrics.avgMonthlyPrice).toLocaleString()}
                    <span className="ml-1 text-sm text-bx-gray-dim">
                      {isKo ? "만원/월" : "₩10K/mo"}
                    </span>
                  </p>
                </div>
                <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-4 sm:col-span-2">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ {t("estMonthlyImp")} ]
                  </p>
                  <p className="mt-2 font-mono text-xl font-bold tabular-nums text-bx-black">
                    {metrics.estimatedMonthlyImpressions.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="-ml-[2px] border-2 border-bx-black bg-bx-white p-6">
              <PlannerReachDonutChart
                corePct={reachCorePct}
                extendedPct={reachExtendedPct}
                title={t("chartReachTitle")}
                coreLabel={t("reachCore")}
                extendedLabel={t("reachExtended")}
              />
            </div>
          </div>

          <div className="mt-6 border-2 border-bx-black bg-bx-white">
            <div className="border-b-2 border-bx-black p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("chartDailyBarTitle")} ]
              </p>
            </div>
            <div className="p-4">
              <PlannerDailyReachBarChart
                data={portfolioDailyByCategory(portfolio).map((p) => ({
                  key: p.key,
                  label: isKo ? p.labelKo : p.labelEn,
                  value: p.daily,
                }))}
                title={t("chartDailyBarTitle")}
                valueLabel={t("chartDailyBarAxis")}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-0 lg:grid-cols-2">
            <div className="border-2 border-bx-black bg-bx-white">
              <div className="border-b-2 border-bx-black p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("chartCpmTitle")} ]
                </p>
              </div>
              <div className="p-4">
                <PlannerCpmCompareChart
                  data={cpmBars}
                  title={t("chartCpmTitle")}
                  unitLabel={t("chartCpmUnit")}
                />
              </div>
            </div>
            <div className="-ml-[2px] border-2 border-bx-black bg-bx-white">
              <div className="border-b-2 border-bx-black p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ {t("chartMonthCompareTitle")} ]
                </p>
              </div>
              <div className="p-4">
                <PlannerMonthCompareChart
                  data={monthCompare.map((x) => ({
                    months: x.months,
                    total: x.totalImpressions,
                  }))}
                  title={t("chartMonthCompareTitle")}
                  barLabels={[t("monthCompare1"), t("monthCompare3"), t("monthCompare6")]}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 border-2 border-bx-black bg-bx-white">
            <div className="border-b-2 border-bx-black p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("chartImpLineTitle")} ]
              </p>
            </div>
            <div className="p-4">
              <PlannerImpressionsLineChart
                data={metrics.cumulativeByMonth}
                isKo={isKo}
                title={t("chartImpLineTitle")}
              />
            </div>
          </div>

          <div className="mt-6 border-2 border-bx-black bg-bx-white">
            <div className="border-b-2 border-bx-black p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {t("chartRoiLineTitle")} ]
              </p>
            </div>
            <div className="p-4">
              <PlannerRoiLineChart
                data={metrics.roiByMonth}
                isKo={isKo}
                title={t("chartRoiLineTitle")}
                hint={t("chartRoiLineHint")}
                legendConservative={t("roiConservative")}
                legendExpected={t("roiExpected")}
                legendOptimistic={t("roiOptimistic")}
                roiUnit={t("roiUnit")}
              />
            </div>
          </div>
        </section>
      ) : null}

      {portfolio.length > 0 ? (
        <PortfolioTrafficSection portfolio={portfolio} isKo={isKo} />
      ) : null}

      <section>
        <h4 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {t("reportSectionBudgetAllocation")} ]
        </h4>
        <p className="mb-4 font-mono text-[11px] tracking-tight text-bx-gray-dim">
          {t("reportBudgetAllocationIntro")}
        </p>
        {budgetAllocation.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
            —
          </p>
        ) : (
          <ul className="space-y-4">
            {budgetAllocation.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-bold tracking-tight text-bx-black">
                    {row.label}
                  </span>
                  <span className="font-mono tabular-nums text-bx-gray-dim">
                    {row.pct}% · {row.valueMan.toLocaleString()}
                    {isKo ? "만/월" : " ₩10K/mo"}
                  </span>
                </div>
                <div className="h-3 w-full border-2 border-bx-black bg-bx-white">
                  <div
                    className="h-full bg-bx-accent"
                    style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-2 border-bx-accent bg-bx-white p-5 sm:p-6">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {t("reportSectionEffectSummary")} ]
        </h4>
        <p className="mt-1 font-mono text-[11px] tracking-tight text-bx-gray-dim">
          {t("reportEffectSummaryIntro")}
        </p>
        <ul className="mt-4 space-y-2 text-sm text-bx-black">
          {effectSummaryLines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-bx-accent">·</span>
              <span>{line}</span>
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
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
          [ {isKo ? "노출 패턴 (시간대 · 요일 · 월별)" : "EXPOSURE PATTERN (HOURLY · WEEKDAY · MONTHLY)"} ]
        </h4>
        {!agg.allReal ? (
          <span className="border-2 border-bx-accent bg-bx-white px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-accent">
            {isKo ? "일부 추정치" : "partly estimated"}
          </span>
        ) : null}
      </div>
      <p className="mb-4 font-mono text-[11px] tracking-tight text-bx-gray-dim">
        {isKo
          ? "매체 상세의 일유동 데이터(또는 매체유형·지역 기반 추정)를 가중평균한 캠페인 전체의 노출 패턴입니다."
          : "Aggregated exposure pattern across the campaign, weighted by daily footfall."}
      </p>
      <div className="grid gap-0 sm:grid-cols-3">
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
    <div className="-mt-[2px] -ml-[2px] border-2 border-bx-black bg-bx-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-black">
          [ {title} ]
        </p>
        <span className="border-2 border-bx-accent bg-bx-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-bx-white">
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
                  isPeak ? "bg-bx-accent" : "bg-bx-black"
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
            className="flex-1 text-center font-mono text-[8px] font-bold leading-tight tracking-[0.18em] text-bx-gray-dim"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
