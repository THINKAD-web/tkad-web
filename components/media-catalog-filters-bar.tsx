"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  TARGET_AGE_BUCKETS,
  type CatalogBounds,
  type TargetAgeBucket,
} from "@/lib/media-filter-advanced";
import type {
  MediaCatalogFiltersState,
  ToggleMediaCatalogFilter,
} from "@/lib/use-media-catalog-filters";

const selectClass =
  "h-10 min-w-[6.5rem] rounded-lg border border-navy/15 bg-white px-2.5 text-sm font-medium text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 sm:min-w-[7.5rem]";

const rangeMinClass =
  "h-2.5 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-gold";
const rangeMaxClass =
  "h-2.5 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-navy";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export type MediaCatalogFiltersBarProps = {
  search: React.ReactNode;
  mediaRegionFilter: string;
  onMediaRegionFilterChange: (v: string) => void;
  mediaTypeFilter: string;
  onMediaTypeFilterChange: (v: string) => void;
  regionOptions: { value: string; label: string }[];
  bounds: CatalogBounds;
  budgetMin: number;
  budgetMax: number;
  onBudgetMinChange: (v: number) => void;
  onBudgetMaxChange: (v: number) => void;
  filters: MediaCatalogFiltersState;
  onToggleFilter: ToggleMediaCatalogFilter;
  onReset: () => void;
};

/**
 * 매체 검색·견적 공통: 지역, 유형, 예산 범위(슬라이더), 타겟 연령(멀티), 검색, 초기화.
 */
export default function MediaCatalogFiltersBar({
  search,
  mediaRegionFilter,
  onMediaRegionFilterChange,
  mediaTypeFilter,
  onMediaTypeFilterChange,
  regionOptions,
  bounds,
  budgetMin,
  budgetMax,
  onBudgetMinChange,
  onBudgetMaxChange,
  filters,
  onToggleFilter,
  onReset,
}: MediaCatalogFiltersBarProps) {
  const tMedia = useTranslations("media");
  const tCommon = useTranslations("common");

  const [regionQuery, setRegionQuery] = useState("");

  const filteredRegionOptions = useMemo(() => {
    const q = regionQuery.trim();
    if (!q) return regionOptions;
    return regionOptions.filter((o) => o.label.includes(q));
  }, [regionOptions, regionQuery]);

  const priceStep =
    bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100;

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:gap-5">
        {/* 지역 · 유형 */}
        <div className="flex flex-col gap-3 border-b border-navy/5 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
          <label className="flex min-w-0 flex-col gap-2 sm:min-w-[10rem]">
            <span className="text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              {tMedia("filterRegion")}
            </span>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                placeholder="지역 이름으로 검색"
                className="h-9 rounded-lg border border-navy/15 bg-slate-50 px-2.5 text-xs text-navy outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
              />
              <select
                value={mediaRegionFilter}
                onChange={(e) => onMediaRegionFilterChange(e.target.value)}
                className={selectClass}
                aria-label={tMedia("filterRegion")}
              >
                {filteredRegionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex min-w-0 flex-col gap-2 sm:min-w-[10rem]">
            <span className="text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              {tMedia("filterType")}
            </span>
            <select
              value={mediaTypeFilter}
              onChange={(e) => onMediaTypeFilterChange(e.target.value)}
              className={selectClass}
              aria-label={tMedia("filterType")}
            >
              <option value="all">{tMedia("filterTypeAll")}</option>
              <option value="digital">{tMedia("filterTypeDigital")}</option>
              <option value="static">{tMedia("filterTypeStatic")}</option>
              <option value="mobile">{tMedia("filterTypeMobile")}</option>
            </select>
          </label>
        </div>

        {/* 예산 범위 */}
        <div className="rounded-xl border border-navy/10 bg-slate-50/60 px-4 py-2.5">
          <p className="mb-1 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
            {tMedia("filterBudgetRange")}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground tabular-nums sm:text-xs">
            {budgetMin.toLocaleString()} – {budgetMax.toLocaleString()}{" "}
            {tMedia("advanced.tenThousandWonPerMo")}
          </p>
          <div className="flex flex-col gap-2.5">
            <input
              type="range"
              min={bounds.minPrice}
              max={bounds.maxPrice}
              step={priceStep}
              value={clamp(budgetMin, bounds.minPrice, budgetMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                onBudgetMinChange(clamp(v, bounds.minPrice, budgetMax));
              }}
              className={rangeMinClass}
              aria-label={tMedia("filterBudgetMin")}
            />
            <input
              type="range"
              min={bounds.minPrice}
              max={bounds.maxPrice}
              step={priceStep}
              value={clamp(budgetMax, budgetMin, bounds.maxPrice)}
              onChange={(e) => {
                const v = Number(e.target.value);
                onBudgetMaxChange(clamp(v, budgetMin, bounds.maxPrice));
              }}
              className={rangeMaxClass}
              aria-label={tMedia("filterBudgetMax")}
            />
          </div>
        </div>

        {/* 타겟 연령 */}
        <div className="border-t border-navy/5 pt-3">
          <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
            {tMedia("filterTargetAge")}
          </p>
          <div className="flex flex-wrap gap-2.5 sm:gap-3">
            {TARGET_AGE_BUCKETS.map((k) => {
              const on = Boolean(filters.targetAge[k]);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onToggleFilter("targetAge", k)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    on
                      ? "border-gold/60 bg-gold/15 text-navy"
                      : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                  )}
                  aria-pressed={on}
                >
                  {tMedia(`advanced.age.${k}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* 타겟 특성 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              타겟 특성
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "commute", label: "출퇴근형" },
                { key: "shopping", label: "쇼핑형" },
                { key: "leisure_night", label: "여가·야간형" },
                { key: "tourism", label: "관광형" },
                { key: "fandom", label: "팬덤·아이돌 응원형" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.targetTraits?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("targetTraits", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 특수 기능 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              특수 기능
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "qr", label: "QR 연동 가능" },
                { key: "measurement", label: "데이터 측정 가능" },
                { key: "interactive", label: "인터랙티브" },
                { key: "motion_3d", label: "3D / 모션 지원" },
                { key: "strong_night", label: "야간 조명 강함" },
                { key: "ar", label: "AR 연동" },
                { key: "social_share", label: "소셜 공유 가능" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.specialFeature?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("specialFeature", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 매체 사이즈 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              매체 사이즈
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "large", label: "대형" },
                { key: "medium", label: "중형" },
                { key: "small", label: "소형" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.size?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("size", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 집행 기간 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              집행 기간
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "lte_1w", label: "1주 이내" },
                { key: "1w_4w", label: "2~4주" },
                { key: "1m_3m", label: "1~3개월" },
                { key: "gte_3m", label: "3개월 이상" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.duration?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("duration", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover-border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 노출 시간대 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              노출 시간대
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "daytime", label: "주간형" },
                { key: "night", label: "야간형" },
                { key: "full_day", label: "24시간형" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.exposureTime?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("exposureTime", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 업종 */}
        {onToggleFilter ? (
          <div className="border-t border-navy/5 pt-3">
            <p className="mb-2 text-[13px] font-semibold tracking-tight text-navy sm:text-sm">
              업종
            </p>
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              {[
                { key: "food_beverage", label: "식음료" },
                { key: "fashion_beauty", label: "패션/뷰티" },
                { key: "entertainment", label: "엔터테인먼트" },
                { key: "automotive", label: "자동차" },
                { key: "finance", label: "금융/보험" },
                { key: "tech", label: "IT/테크" },
                { key: "health", label: "의료/헬스" },
                { key: "education", label: "교육" },
                { key: "real_estate", label: "부동산" },
                { key: "lifestyle", label: "생활용품" },
              ].map(({ key, label }) => {
                const on = Boolean(filters.industry?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleFilter("industry", key)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-navy/15 bg-white text-muted-foreground hover:border-navy/25 hover:text-navy",
                    )}
                    aria-pressed={on}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* 검색 영역 */}
        <div className="min-w-0 border-t border-navy/5 pt-3">{search}</div>

        {/* 초기화 버튼 */}
        <div className="flex justify-end border-t border-navy/8 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full border border-navy/15 px-4 text-xs font-semibold text-muted-foreground"
            onClick={onReset}
          >
            {tCommon("reset")}
          </Button>
        </div>
      </div>
    </div>
  );
}
