"use client";

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  PRECISION_AREA_SPOTS,
  PRECISION_BUDGET_MAX_MAN,
  PRECISION_BUDGET_MIN_MAN,
  PRECISION_CAMPAIGN_PURPOSES,
  PRECISION_DURATION_ITEMS,
  PRECISION_INDUSTRY_TAGS,
  PRECISION_MEDIA_FORMATS,
  PRECISION_SPECIAL_FEATURES,
  PRECISION_TARGET_PERSONAS,
} from "@/lib/media-precision-filter-config";
import type { CatalogBounds } from "@/lib/media-filter-advanced";
import type {
  MediaCatalogFiltersState,
  ToggleMediaCatalogFilter,
} from "@/lib/use-media-catalog-filters";

const rangeMinClass =
  "h-2 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-gold";
const rangeMaxClass =
  "h-2 w-full cursor-pointer touch-manipulation [-webkit-appearance:none] appearance-none accent-navy";

const checkboxClass =
  "mt-0.5 size-3.5 shrink-0 rounded border-slate-300 text-navy focus:ring-gold/40";

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function countMap(m: Partial<Record<string, boolean>> | undefined) {
  return Object.values(m ?? {}).filter(Boolean).length;
}

/** 그룹 헤더: 제목(bold) + 오른쪽 (선택 수 · 모두 선택 · 초기화) */
function PrecisionGroupHeader({
  title,
  selectedCount,
  onSelectAll,
  onClear,
  selectAllLabel,
  clearLabel,
}: {
  title: string;
  selectedCount: number;
  onSelectAll?: () => void;
  onClear?: () => void;
  selectAllLabel: string;
  clearLabel: string;
}) {
  return (
    <div className="mb-3 flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-dashed border-slate-200/80 pb-3">
      <h3 className="min-w-0 flex-1 text-sm font-bold tracking-tight text-navy">
        {title}
      </h3>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className="min-w-[2.25rem] rounded-full bg-navy/[0.08] px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-navy"
          aria-live="polite"
        >
          ({selectedCount})
        </span>
        {onSelectAll ? (
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy shadow-sm transition-colors hover:bg-slate-50"
          >
            {selectAllLabel}
          </button>
        ) : null}
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-navy hover:underline"
          >
            {clearLabel}
          </button>
        ) : null}
      </div>
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
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, label }) => {
        const checked = Boolean(map?.[key]);
        return (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200/60 bg-white/80 px-2.5 py-2 text-[13px] leading-snug transition-colors",
              checked
                ? "border-navy/30 bg-navy/[0.06] text-navy ring-1 ring-navy/10"
                : "text-muted-foreground hover:border-slate-300",
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(category, key)}
              className={checkboxClass}
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );
}

export type MediaPrecisionFiltersAssistantProps = {
  budgetBounds: CatalogBounds;
  budgetMin: number;
  budgetMax: number;
  onBudgetMinChange: (v: number) => void;
  onBudgetMaxChange: (v: number) => void;
  filters: MediaCatalogFiltersState;
  onToggleFilter: ToggleMediaCatalogFilter;
  onReset: () => void;
  clearCategory: (category: keyof MediaCatalogFiltersState) => void;
  selectAllInCategory: (
    category: keyof MediaCatalogFiltersState,
    keys: readonly string[],
  ) => void;
};

/**
 * /media 정밀 필터 — 그룹 순서: 지역 → 매체 유형 → 타겟 → 업종 → 특별 목적 → 예산 → 집행 기간 → 특수 기능(아코디언)
 */
export function MediaPrecisionFiltersAssistant({
  budgetBounds,
  budgetMin,
  budgetMax,
  onBudgetMinChange,
  onBudgetMaxChange,
  filters,
  onToggleFilter,
  onReset,
  clearCategory,
  selectAllInCategory,
}: MediaPrecisionFiltersAssistantProps) {
  const tMedia = useTranslations("media");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [specialOpen, setSpecialOpen] = useState(false);

  const priceStep =
    budgetBounds.maxPrice - budgetBounds.minPrice <= 500 ? 50 : 100;

  const areaKeys = PRECISION_AREA_SPOTS.map((x) => x.key);
  const formatKeys = PRECISION_MEDIA_FORMATS.map((x) => x.key);
  const personaKeys = PRECISION_TARGET_PERSONAS.map((x) => x.key);
  const industryKeys = PRECISION_INDUSTRY_TAGS.map((x) => x.key);
  const purposeKeys = PRECISION_CAMPAIGN_PURPOSES.map((x) => x.key);
  const durationKeys = PRECISION_DURATION_ITEMS.map((x) => x.key);
  const specialKeys = PRECISION_SPECIAL_FEATURES.map((x) => x.key);

  const resetBudget = useCallback(() => {
    onBudgetMinChange(PRECISION_BUDGET_MIN_MAN);
    onBudgetMaxChange(PRECISION_BUDGET_MAX_MAN);
  }, [onBudgetMinChange, onBudgetMaxChange]);

  const budgetActive =
    budgetMin > PRECISION_BUDGET_MIN_MAN ||
    budgetMax < PRECISION_BUDGET_MAX_MAN;
  const budgetCount = budgetActive ? 1 : 0;

  const specialSel = countMap(filters.specialFeature);

  const groupShell = "rounded-xl border border-dashed border-slate-200/70 bg-white/65 p-3.5 shadow-sm sm:p-4";

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-slate-300/80 bg-slate-50/90 p-4 shadow-inner sm:p-5"
      data-precision-panel
    >
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* 1. 지역 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("filterGroupRegion")}
            selectedCount={countMap(filters.areaSpot)}
            onSelectAll={() => selectAllInCategory("areaSpot", areaKeys)}
            onClear={() => clearCategory("areaSpot")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_AREA_SPOTS}
            category="areaSpot"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 2. 매체 유형 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("filterGroupMediaType")}
            selectedCount={countMap(filters.mediaFormat)}
            onSelectAll={() => selectAllInCategory("mediaFormat", formatKeys)}
            onClear={() => clearCategory("mediaFormat")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_MEDIA_FORMATS}
            category="mediaFormat"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 3. 타겟 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("filterGroupTarget")}
            selectedCount={countMap(filters.targetPersona)}
            onSelectAll={() =>
              selectAllInCategory("targetPersona", personaKeys)
            }
            onClear={() => clearCategory("targetPersona")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_TARGET_PERSONAS}
            category="targetPersona"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 4. 업종 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("filterGroupIndustry")}
            selectedCount={countMap(filters.industryTag)}
            onSelectAll={() =>
              selectAllInCategory("industryTag", industryKeys)
            }
            onClear={() => clearCategory("industryTag")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_INDUSTRY_TAGS}
            category="industryTag"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 5. 특별 목적 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("precisionFilterGroupPurpose")}
            selectedCount={countMap(filters.campaignPurpose)}
            onSelectAll={() =>
              selectAllInCategory("campaignPurpose", purposeKeys)
            }
            onClear={() => clearCategory("campaignPurpose")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_CAMPAIGN_PURPOSES}
            category="campaignPurpose"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 6. 예산 (슬라이더) */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("precisionFilterGroupBudget")}
            selectedCount={budgetCount}
            onSelectAll={() => {
              onBudgetMinChange(budgetBounds.minPrice);
              onBudgetMaxChange(budgetBounds.maxPrice);
            }}
            onClear={resetBudget}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <p className="mb-2 text-xs text-muted-foreground">
            {tMedia("precisionBudgetSliderHint")}
          </p>
          <p className="mb-3 text-sm font-medium tabular-nums text-navy">
            {budgetMin.toLocaleString()} – {budgetMax.toLocaleString()}{" "}
            {tMedia("advanced.tenThousandWonPerMo")}
          </p>
          <div className="flex flex-col gap-2.5">
            <input
              type="range"
              min={budgetBounds.minPrice}
              max={budgetBounds.maxPrice}
              step={priceStep}
              value={clamp(budgetMin, budgetBounds.minPrice, budgetMax)}
              onChange={(e) => {
                const v = Number(e.target.value);
                onBudgetMinChange(clamp(v, budgetBounds.minPrice, budgetMax));
              }}
              className={rangeMinClass}
              aria-label={tMedia("filterBudgetMin")}
            />
            <input
              type="range"
              min={budgetBounds.minPrice}
              max={budgetBounds.maxPrice}
              step={priceStep}
              value={clamp(budgetMax, budgetMin, budgetBounds.maxPrice)}
              onChange={(e) => {
                const v = Number(e.target.value);
                onBudgetMaxChange(
                  clamp(v, budgetMin, budgetBounds.maxPrice),
                );
              }}
              className={rangeMaxClass}
              aria-label={tMedia("filterBudgetMax")}
            />
          </div>
        </section>

        {/* 7. 집행 기간 */}
        <section className={groupShell}>
          <PrecisionGroupHeader
            title={tMedia("filterGroupDuration")}
            selectedCount={countMap(filters.duration)}
            onSelectAll={() =>
              selectAllInCategory("duration", durationKeys)
            }
            onClear={() => clearCategory("duration")}
            selectAllLabel={tMedia("filterGroupSelectAll")}
            clearLabel={tMedia("filterGroupClear")}
          />
          <CheckboxGrid
            items={PRECISION_DURATION_ITEMS}
            category="duration"
            filters={filters}
            onToggle={onToggleFilter}
          />
        </section>

        {/* 8. 특수 기능 (아코디언) */}
        <section className="overflow-hidden rounded-xl border border-dashed border-slate-200/70 bg-white/65 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-dashed border-slate-200/80 px-3.5 py-3 sm:px-4">
            <button
              type="button"
              onClick={() => setSpecialOpen((v) => !v)}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="text-sm font-bold text-navy">
                {tMedia("filterGroupSpecial")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {tMedia("filterGroupSpecialHint")}
              </p>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span
                className="min-w-[2.25rem] rounded-full bg-navy/[0.08] px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-navy"
                aria-live="polite"
              >
                ({specialSel})
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAllInCategory("specialFeature", specialKeys);
                }}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-navy shadow-sm transition-colors hover:bg-slate-50"
              >
                {tMedia("filterGroupSelectAll")}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearCategory("specialFeature");
                }}
                className="rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-navy hover:underline"
              >
                {tMedia("filterGroupClear")}
              </button>
              <button
                type="button"
                onClick={() => setSpecialOpen((v) => !v)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-slate-100/80"
                aria-expanded={specialOpen}
                aria-label={
                  specialOpen
                    ? locale === "ko"
                      ? "특수 기능 접기"
                      : "Collapse special features"
                    : locale === "ko"
                      ? "특수 기능 펼치기"
                      : "Expand special features"
                }
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    specialOpen && "rotate-180",
                  )}
                />
              </button>
            </div>
          </div>
          {specialOpen ? (
            <div className="px-3.5 pb-4 pt-3 sm:px-4">
              <CheckboxGrid
                items={PRECISION_SPECIAL_FEATURES}
                category="specialFeature"
                filters={filters}
                onToggle={onToggleFilter}
              />
            </div>
          ) : null}
        </section>

        <div className="flex justify-end border-t border-dashed border-slate-200/70 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-full border-slate-300/90 px-5 text-xs font-semibold"
            onClick={onReset}
          >
            {tCommon("reset")}
          </Button>
        </div>
      </div>
    </div>
  );
}
