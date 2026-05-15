"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  TARGET_AGE_BUCKETS,
  type CatalogBounds,
} from "@/lib/media-filter-advanced";
import {
  DURATION_ITEMS,
  EXPOSURE_ITEMS,
  INDUSTRY_ITEMS,
  SIZE_ITEMS,
  SPECIAL_FEATURE_ITEMS,
  TARGET_TRAIT_ITEMS,
} from "@/lib/media-catalog-filter-items";
import type {
  MediaCatalogFiltersState,
  ToggleMediaCatalogFilter,
} from "@/lib/use-media-catalog-filters";
import { MediaPrecisionFiltersAssistant } from "@/components/media-precision-filters-assistant";

const selectClass =
  "h-10 min-w-[6.5rem] rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-navy shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 sm:min-w-[7.5rem]";

const rangeMinClass =
  "h-2.5 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-gold";
const rangeMaxClass =
  "h-2.5 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-navy";

const checkboxClass =
  "mt-0.5 size-4 shrink-0 rounded border-slate-300 text-navy focus:ring-gold/40";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export type MediaCatalogFiltersBarProps = {
  categoryTabs?: React.ReactNode;
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
  /** /media 정밀 필터 패널: 바깥 토글 없이 항상 펼침, 여밉·계층 강조 */
  precisionPanel?: boolean;
  clearCategory?: (category: keyof MediaCatalogFiltersState) => void;
  selectAllInCategory?: (
    category: keyof MediaCatalogFiltersState,
    keys: readonly string[],
  ) => void;
  /** /media 정밀 필터 예산 슬라이더 범위(만원/월) */
  precisionBudgetBounds?: CatalogBounds;
};

function GroupShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-100 bg-white/90 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function GroupHeader({
  title,
  showActions,
  onSelectAll,
  onClear,
  selectAllLabel,
  clearLabel,
}: {
  title: string;
  showActions: boolean;
  onSelectAll?: () => void;
  onClear?: () => void;
  selectAllLabel: string;
  clearLabel: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
      <h3 className="text-sm font-bold tracking-tight text-navy">{title}</h3>
      {showActions && (onSelectAll || onClear) ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {onSelectAll ? (
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-navy/80 transition-colors hover:bg-slate-100"
            >
              {selectAllLabel}
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-transparent px-2.5 py-1 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-navy hover:underline"
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CheckboxGrid({
  items,
  category,
  filters,
  onToggle,
}: {
  items: readonly { key: string; label: string }[];
  category: keyof MediaCatalogFiltersState;
  filters: MediaCatalogFiltersState;
  onToggle: ToggleMediaCatalogFilter;
}) {
  const map = filters[category] as Record<string, boolean | undefined>;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, label }) => {
        const checked = Boolean(map?.[key]);
        return (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              checked
                ? "border-navy/20 bg-navy/[0.04] text-navy"
                : "border-slate-200/90 bg-slate-50/40 text-muted-foreground hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(category, key)}
              className={checkboxClass}
            />
            <span className="leading-snug">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

export default function MediaCatalogFiltersBar({
  categoryTabs,
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
  precisionPanel = false,
  clearCategory,
  selectAllInCategory,
  precisionBudgetBounds,
}: MediaCatalogFiltersBarProps) {
  const tMedia = useTranslations("media");
  const tCommon = useTranslations("common");

  const [regionQuery, setRegionQuery] = useState("");
  const [internalFiltersOpen, setInternalFiltersOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);

  const filteredRegionOptions = useMemo(() => {
    const q = regionQuery.trim();
    if (!q) return regionOptions;
    return regionOptions.filter((o) => o.label.includes(q));
  }, [regionOptions, regionQuery]);

  const priceStep =
    bounds.maxPrice - bounds.minPrice <= 500 ? 50 : 100;

  const groupActions = Boolean(
    precisionPanel && clearCategory && selectAllInCategory,
  );

  const traitKeys = TARGET_TRAIT_ITEMS.map((x) => x.key);
  const ageKeys = [...TARGET_AGE_BUCKETS];
  const industryKeys = INDUSTRY_ITEMS.map((x) => x.key);
  const sizeKeys = SIZE_ITEMS.map((x) => x.key);
  const durationKeys = DURATION_ITEMS.map((x) => x.key);
  const exposureKeys = EXPOSURE_ITEMS.map((x) => x.key);
  const specialKeys = SPECIAL_FEATURE_ITEMS.map((x) => x.key);

  const activeCount = [
    mediaRegionFilter !== "all" ? 1 : 0,
    mediaTypeFilter !== "all" ? 1 : 0,
    budgetMin !== bounds.minPrice || budgetMax !== bounds.maxPrice ? 1 : 0,
    ...Object.values(filters.targetAge ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.targetTraits ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.specialFeature ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.size ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.duration ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.exposureTime ?? {}).map((v) => (v ? 1 : 0)),
    ...Object.values(filters.industry ?? {}).map((v) => (v ? 1 : 0)),
  ].reduce((a, b) => a + b, 0);

  const contentVisible = internalFiltersOpen;

  if (precisionPanel) {
    return (
      <MediaPrecisionFiltersAssistant
        budgetBounds={precisionBudgetBounds ?? bounds}
        budgetMin={budgetMin}
        budgetMax={budgetMax}
        onBudgetMinChange={onBudgetMinChange}
        onBudgetMaxChange={onBudgetMaxChange}
        filters={filters}
        onToggleFilter={onToggleFilter}
        onReset={onReset}
        clearCategory={clearCategory!}
        selectAllInCategory={selectAllInCategory!}
      />
    );
  }

  const inner = (
    <div className="flex flex-col gap-8 sm:gap-10 border-t border-navy/5 p-4 sm:p-5">
      {/* 1. 지역 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupRegion")}
          showActions={false}
          onSelectAll={undefined}
          onClear={undefined}
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupRestoreDefault")}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md">
            <span className="text-xs font-semibold text-muted-foreground">
              {tMedia("filterRegion")}
            </span>
            <input
              type="text"
              value={regionQuery}
              onChange={(e) => setRegionQuery(e.target.value)}
              placeholder={tMedia("filterRegionSearchPlaceholder")}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/35"
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
          </label>
        </div>
      </GroupShell>

      {/* 2. 매체 유형 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupMediaType")}
          showActions={false}
          onSelectAll={undefined}
          onClear={undefined}
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupRestoreDefault")}
        />
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
      </GroupShell>

      {/* 카테고리 탭 (메인/교통 등) */}
      {categoryTabs ? (
        <GroupShell>
          <GroupHeader
            title={tMedia("filterGroupCategory")}
            showActions={false}
            selectAllLabel=""
            clearLabel=""
          />
          <div className="space-y-2">{categoryTabs}</div>
        </GroupShell>
      ) : null}

      {/* 3. 타겟 — 특성 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupTargetTraits")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("targetTraits", traitKeys)
              : undefined
          }
          onClear={
            groupActions ? () => clearCategory!("targetTraits") : undefined
          }
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <CheckboxGrid
          items={TARGET_TRAIT_ITEMS}
          category="targetTraits"
          filters={filters}
          onToggle={onToggleFilter}
        />
      </GroupShell>

      {/* 타겟 — 연령 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupTargetAge")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("targetAge", ageKeys)
              : undefined
          }
          onClear={
            groupActions ? () => clearCategory!("targetAge") : undefined
          }
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TARGET_AGE_BUCKETS.map((k) => {
            const checked = Boolean(filters.targetAge[k]);
            return (
              <label
                key={k}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-navy/20 bg-navy/[0.04] text-navy"
                    : "border-slate-200/90 bg-slate-50/40 text-muted-foreground hover:border-slate-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleFilter("targetAge", k)}
                  className={checkboxClass}
                />
                <span className="leading-snug">{tMedia(`advanced.age.${k}`)}</span>
              </label>
            );
          })}
        </div>
      </GroupShell>

      {/* 4. 업종 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupIndustry")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("industry", industryKeys)
              : undefined
          }
          onClear={
            groupActions ? () => clearCategory!("industry") : undefined
          }
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <CheckboxGrid
          items={INDUSTRY_ITEMS}
          category="industry"
          filters={filters}
          onToggle={onToggleFilter}
        />
      </GroupShell>

      {/* 5. 예산 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterBudgetRange")}
          showActions={false}
          onSelectAll={undefined}
          onClear={undefined}
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupRestoreDefault")}
        />
        <p className="mb-3 text-xs tabular-nums text-muted-foreground">
          {budgetMin.toLocaleString()} – {budgetMax.toLocaleString()}{" "}
          {tMedia("advanced.tenThousandWonPerMo")}
        </p>
        <div className="flex flex-col gap-3">
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
      </GroupShell>

      {/* 6. 집행 기간 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupDuration")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("duration", durationKeys)
              : undefined
          }
          onClear={
            groupActions ? () => clearCategory!("duration") : undefined
          }
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <CheckboxGrid
          items={DURATION_ITEMS}
          category="duration"
          filters={filters}
          onToggle={onToggleFilter}
        />
      </GroupShell>

      {/* 7. 노출 시간대 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupExposure")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("exposureTime", exposureKeys)
              : undefined
          }
          onClear={
            groupActions ? () => clearCategory!("exposureTime") : undefined
          }
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <CheckboxGrid
          items={EXPOSURE_ITEMS}
          category="exposureTime"
          filters={filters}
          onToggle={onToggleFilter}
        />
      </GroupShell>

      {/* 8. 매체 사이즈 */}
      <GroupShell>
        <GroupHeader
          title={tMedia("filterGroupSize")}
          showActions={groupActions}
          onSelectAll={
            groupActions
              ? () => selectAllInCategory!("size", sizeKeys)
              : undefined
          }
          onClear={groupActions ? () => clearCategory!("size") : undefined}
          selectAllLabel={tMedia("filterGroupSelectAll")}
          clearLabel={tMedia("filterGroupClear")}
        />
        <CheckboxGrid
          items={SIZE_ITEMS}
          category="size"
          filters={filters}
          onToggle={onToggleFilter}
        />
      </GroupShell>

      {/* 9. 특수 기능 — 접기 */}
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80">
        <button
          type="button"
          onClick={() => setSpecialOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-bold text-navy transition-colors hover:bg-slate-100/60 sm:px-5"
        >
          <span>
            {tMedia("filterGroupSpecial")}
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              {tMedia("filterGroupSpecialHint")}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              specialOpen && "rotate-180",
            )}
          />
        </button>
        {specialOpen ? (
          <div className="border-t border-slate-200/80 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
            {groupActions ? (
              <div className="mb-3 flex flex-wrap justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => selectAllInCategory!("specialFeature", specialKeys)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-navy/80 hover:bg-slate-50"
                >
                  {tMedia("filterGroupSelectAll")}
                </button>
                <button
                  type="button"
                  onClick={() => clearCategory!("specialFeature")}
                  className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-navy hover:underline"
                >
                  {tMedia("filterGroupClear")}
                </button>
              </div>
            ) : null}
            <CheckboxGrid
              items={SPECIAL_FEATURE_ITEMS}
              category="specialFeature"
              filters={filters}
              onToggle={onToggleFilter}
            />
          </div>
        ) : null}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-full border-slate-200 px-4 text-xs font-semibold"
          onClick={onReset}
        >
          {tCommon("reset")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-navy/10 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setInternalFiltersOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 sm:px-5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-navy">
          <SlidersHorizontal className="h-4 w-4" />
          {tMedia("filterPanelTitle")}
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-navy">
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            contentVisible && "rotate-180",
          )}
        />
      </button>
      {contentVisible ? inner : null}
    </div>
  );
}
