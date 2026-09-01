"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calculator, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  defaultMonthlyPriceWon,
  estimateMediaOwnerRevenue,
  formatRevenueManWon,
  REVENUE_CALC_MEDIA_TYPES,
  REVENUE_CALC_REGIONS,
  REVENUE_PRICE_SLIDER,
  type RevenueCalcMediaType,
  type RevenueCalcRegion,
} from "@/lib/media-owner-revenue-estimate";

type Props = {
  locale: string;
  variant?: "landing" | "portal";
  /** 등록 페이지: 폼 앵커로 스크롤 */
  registerAnchor?: string;
  className?: string;
};

export function MediaOwnerRevenueCalculator({
  locale,
  variant = "landing",
  registerAnchor = "#register-form",
  className,
}: Props) {
  const isKo = locale === "ko";
  const [region, setRegion] = useState<RevenueCalcRegion>("seoul_gangnam");
  const [mediaType, setMediaType] = useState<RevenueCalcMediaType>("dooh");
  const [monthlyPriceWon, setMonthlyPriceWon] = useState(() =>
    defaultMonthlyPriceWon("seoul_gangnam", "digital"),
  );

  const onRegionChange = (next: RevenueCalcRegion) => {
    setRegion(next);
    setMonthlyPriceWon(defaultMonthlyPriceWon(next, mediaType));
  };

  const onTypeChange = (next: RevenueCalcMediaType) => {
    setMediaType(next);
    setMonthlyPriceWon(defaultMonthlyPriceWon(region, next));
  };

  const estimate = useMemo(
    () =>
      estimateMediaOwnerRevenue({
        region,
        mediaType,
        monthlyPriceWon,
      }),
    [region, mediaType, monthlyPriceWon],
  );

  const isLanding = variant === "landing";
  const shell = isLanding
    ? "rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)] backdrop-blur tkad-neon-border sm:p-8"
    : "rounded-2xl border dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur sm:p-6";

  const inputCls = isLanding
    ? "mt-2 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-white/6 bg-white px-4 py-2.5 text-sm dark:text-white text-gray-900 focus:border-violet-400/50 focus:outline-none"
    : "mt-2 w-full rounded-xl border dark:border-white/12 border-gray-200 dark:bg-black/30 bg-white px-4 py-2.5 text-sm dark:text-white text-gray-900 focus:border-violet-400/40 focus:outline-none";

  return (
    <section className={cn(className)}>
      <div className={shell}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 tkad-type-label text-violet-400">
              <Calculator className="h-3.5 w-3.5" />
              {isKo ? "수익 시뮬레이터" : "Revenue simulator"}
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight dark:text-white text-gray-900 sm:text-2xl">
              {isKo
                ? "내 매체로 얼마나 벌 수 있을까요?"
                : "How much could your media earn?"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed dark:text-white/70 text-gray-600">
              {isKo
                ? "지역·유형별 THINKAD 집행 데이터를 바탕으로 한 추정치입니다. 실제 수익은 노출·가격·시즌에 따라 달라질 수 있습니다."
                : "Estimates based on THINKAD regional execution benchmarks. Actual results vary by season and pricing."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 tkad-type-title text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" />
            {isKo ? "실시간 계산" : "Live estimate"}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <label className="block">
              <span className="tkad-type-title uppercase tracking-wide dark:text-white/60 text-gray-500">
                {isKo ? "매체 위치" : "Region"}
              </span>
              <select
                value={region}
                onChange={(e) =>
                  onRegionChange(e.target.value as RevenueCalcRegion)
                }
                className={inputCls}
              >
                {REVENUE_CALC_REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {isKo ? r.ko : r.en}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="tkad-type-title uppercase tracking-wide dark:text-white/60 text-gray-500">
                {isKo ? "매체 유형" : "Media type"}
              </span>
              <select
                value={mediaType}
                onChange={(e) =>
                  onTypeChange(e.target.value as RevenueCalcMediaType)
                }
                className={inputCls}
              >
                {REVENUE_CALC_MEDIA_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {isKo ? t.ko : t.en}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="flex items-end justify-between gap-3">
                <span className="tkad-type-title uppercase tracking-wide dark:text-white/60 text-gray-500">
                  {isKo ? "월 희망 단가" : "Target monthly rate"}
                </span>
                <span className="font-display text-sm font-bold tabular-nums dark:text-white text-gray-900">
                  {monthlyPriceWon.toLocaleString(isKo ? "ko-KR" : "en-US")}
                  {isKo ? "원" : " KRW"}
                </span>
              </div>
              <input
                type="range"
                min={REVENUE_PRICE_SLIDER.min}
                max={REVENUE_PRICE_SLIDER.max}
                step={REVENUE_PRICE_SLIDER.step}
                value={monthlyPriceWon}
                onChange={(e) => setMonthlyPriceWon(Number(e.target.value))}
                className="mt-3 w-full accent-violet-500"
              />
              <div className="mt-1 flex justify-between tkad-type-note dark:text-white/40 text-gray-400">
                <span>{isKo ? "50만" : "₩0.5M"}</span>
                <span>
                  {isKo ? "지역·유형 평균" : "Regional avg"}{" "}
                  {estimate.benchmarkAvgPriceWon.toLocaleString(isKo ? "ko-KR" : "en-US")}
                </span>
                <span>{isKo ? "3,000만" : "₩30M"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border dark:border-violet-400/25 border-violet-200 bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(34,211,238,0.08))] p-5 sm:p-6">
            <dl className="space-y-4">
              <div>
                <dt className="tkad-type-title dark:text-white/60 text-gray-600">
                  {isKo ? "연간 예상 수익" : "Estimated annual gross"}
                </dt>
                <dd className="mt-1 text-2xl font-black tabular-nums dark:text-white text-gray-900 sm:text-3xl">
                  {formatRevenueManWon(estimate.annualGrossWon, isKo)}
                </dd>
                <dd className="mt-0.5 text-xs dark:text-white/50 text-gray-500">
                  {isKo
                    ? `(가동률 ${Math.round(estimate.utilizationRate * 100)}% 기준)`
                    : `(at ${Math.round(estimate.utilizationRate * 100)}% utilization)`}
                </dd>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t dark:border-white/10 border-gray-200 pt-4">
                <div>
                  <dt className="text-xs dark:text-white/60 text-gray-600">
                    {isKo ? "월 예상 집행 횟수" : "Executions / month"}
                  </dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums dark:text-white text-gray-900">
                    {estimate.monthlyExecutions.toFixed(1)}
                    {isKo ? "회" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs dark:text-white/60 text-gray-600">
                    {isKo ? "THINKAD 수수료" : "THINKAD fee"}
                  </dt>
                  <dd className="mt-1 text-lg font-bold tabular-nums dark:text-white text-gray-900">
                    {estimate.feeRatePercent}%
                  </dd>
                </div>
              </div>

              <div className="rounded-xl border dark:border-emerald-400/30 border-emerald-200 bg-emerald-500/10 px-4 py-3">
                <dt className="tkad-type-title text-emerald-800 dark:text-emerald-200">
                  {isKo ? "순 수익 (수수료 제외)" : "Net revenue (after fee)"}
                </dt>
                <dd className="mt-1 text-xl font-black tabular-nums text-emerald-900 dark:text-emerald-100">
                  {formatRevenueManWon(estimate.annualNetWon, isKo)}
                </dd>
              </div>
            </dl>

            <p className="mt-5 tkad-type-title dark:text-white text-gray-800">
              {isKo
                ? "지금 등록하면 이 수익을 시작할 수 있어요"
                : "Register now to start earning on THINKAD"}
            </p>
            {registerAnchor.startsWith("#") ? (
              <a
                href={registerAnchor}
                className={cn(
                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5",
                  isLanding
                    ? "tkad-neon-cta-clean dark:text-white text-gray-900"
                    : "bg-violet-600 text-white hover:bg-violet-500",
                )}
              >
                {isKo ? "매체 등록 신청하기" : "Apply to list media"}
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <Link
                href={registerAnchor}
                className={cn(
                  "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5",
                  isLanding
                    ? "tkad-neon-cta-clean dark:text-white text-gray-900"
                    : "bg-violet-600 text-white hover:bg-violet-500",
                )}
              >
                {isKo ? "매체 등록 신청하기" : "Apply to list media"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
