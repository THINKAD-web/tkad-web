"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  TARGET_AGE_BUCKETS,
  type CatalogBounds,
  type TargetAgeBucket,
} from "@/lib/media-filter-advanced";

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
  targetAgePick: Partial<Record<TargetAgeBucket, boolean>>;
  onToggleTargetAge: (k: TargetAgeBucket) => void;
  targetTraitsPick?: Partial<Record<string, boolean>>;
  onToggleTargetTrait?: (key: string) => void;
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
  targetAgePick,
  onToggleTargetAge,
  targetTraitsPick,
  onToggleTargetTrait,
  onReset,
}: MediaCatalogFiltersBarProps) {
  const tMedia = useTranslations("media");
  const tCommon = useTranslations("common");

  const priceStep =
    bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100;

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-col gap-1 sm:min-w-[8rem]">
            <span className="text-xs font-semibold text-navy">
              {tMedia("filterRegion")}
            </span>
            <select
              value={mediaRegionFilter}
              onChange={(e) => onMediaRegionFilterChange(e.target.value)}
              className={selectClass}
              aria-label={tMedia("filterRegion")}
            >
              {regionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1 sm:min-w-[8rem]">
            <span className="text-xs font-semibold text-navy">
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

        <div className="rounded-xl border border-navy/10 bg-slate-50/60 px-3 py-3 sm:px-4">
          <p className="mb-1 text-xs font-semibold text-navy">
            {tMedia("filterBudgetRange")}
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground tabular-nums">
            {budgetMin.toLocaleString()} – {budgetMax.toLocaleString()}{" "}
            {tMedia("advanced.tenThousandWonPerMo")}
          </p>
          <div className="flex flex-col gap-2">
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

        <div>
          <p className="mb-2 text-xs font-semibold text-navy">
            {tMedia("filterTargetAge")}
          </p>
          <div className="flex flex-wrap gap-2">
            {TARGET_AGE_BUCKETS.map((k) => {
              const on = Boolean(targetAgePick[k]);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onToggleTargetAge(k)}
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

        {onToggleTargetTrait ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-navy">
              {tMedia("filterTargetTraits")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "commute", label: tMedia("targetTrait.commute") },
                { key: "shopping", label: tMedia("targetTrait.shopping") },
                { key: "leisure_night", label: tMedia("targetTrait.leisureNight") },
                { key: "tourism", label: tMedia("targetTrait.tourism") },
                { key: "fandom", label: tMedia("targetTrait.fandom") },
              ].map(({ key, label }) => {
                const on = Boolean(targetTraitsPick?.[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleTargetTrait(key)}
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

        <div className="min-w-0">{search}</div>

        <div className="flex justify-end border-t border-navy/8 pt-3">
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
