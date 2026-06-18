"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Search,
  X,
  List,
  LayoutGrid,
  AlignJustify,
  Map as MapIcon,
  ChevronDown,
  Monitor,
  Train,
  MapPin,
  ShoppingBag,
  Music,
  Coffee,
  Building2,
  GraduationCap,
  Landmark,
  Globe,
  Network,
  MoreHorizontal,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
  MEDIA_SEARCH_SORT_OPTIONS,
  MEDIA_TARGET_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { MEDIA_CATEGORIES } from "@/lib/media-browse-categories";
import { MEDIA_BROWSE_REGIONS } from "@/lib/media-browse-regions";
import { NETWORK_BROWSE_TYPE_CHIPS } from "@/lib/media-network-types";
import { PlannerNeonLabel } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

export type MediaManualBrowseViewMode = "feed" | "card" | "compact" | "map";

const MAIN_ICONS: Record<string, LucideIcon> = {
  Monitor,
  Train,
  MapPin,
  ShoppingBag,
  Music,
  Coffee,
  Building2,
  GraduationCap,
  Landmark,
  Globe,
  Network,
  MoreHorizontal,
};

const MAIN_COLOR_ACTIVE: Record<string, string> = {
  violet: "bg-violet-500 text-white",
  blue: "bg-blue-500 text-white",
  cyan: "bg-cyan-500 text-white",
  pink: "bg-pink-500 text-white",
  rose: "bg-rose-500 text-white",
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-500 text-white",
  orange: "bg-orange-500 text-white",
  teal: "bg-teal-500 text-white",
  indigo: "bg-indigo-500 text-white",
  purple: "bg-purple-500 text-white",
  gray: "bg-gray-600 text-white",
};

const FEATURE_CHIPS = [
  { value: "instant_booking", labelKo: "즉시 예약", labelEn: "Instant book" },
  { value: "network", labelKo: "네트워크", labelEn: "Network" },
  { value: "24h", labelKo: "24시간", labelEn: "24h" },
] as const;

const VIEW_MODES: {
  id: MediaManualBrowseViewMode;
  labelKo: string;
  labelEn: string;
  icon: typeof List;
}[] = [
  { id: "feed", labelKo: "피드", labelEn: "Feed", icon: List },
  { id: "card", labelKo: "카드", labelEn: "Card", icon: LayoutGrid },
  { id: "compact", labelKo: "컴팩트", labelEn: "Compact", icon: AlignJustify },
  { id: "map", labelKo: "지도", labelEn: "Map", icon: MapIcon },
];

type Props = {
  isKo?: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  mainCategory: string;
  onMainCategoryChange: (v: string) => void;
  subCategory: string;
  onSubCategoryChange: (v: string) => void;
  target: string;
  onTargetChange: (v: string) => void;
  regionMain: string;
  onRegionMainChange: (v: string) => void;
  regionSub: string;
  onRegionSubChange: (v: string) => void;
  priceMin: string;
  onPriceMinChange: (v: string) => void;
  priceMax: string;
  onPriceMaxChange: (v: string) => void;
  features: string;
  onFeaturesChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  viewMode: MediaManualBrowseViewMode;
  onViewModeChange: (mode: MediaManualBrowseViewMode) => void;
  resultCount: number;
  totalCount?: number;
  loading?: boolean;
  selectedCount?: number;
  selectionVariant?: "default" | "plan";
  onSelectedSummaryClick?: () => void;
  compareCount?: number;
  cartCount?: number;
  showSectionHeader?: boolean;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionDesc?: string;
  toolbarEnd?: ReactNode;
  className?: string;
  /** network: `/media/network` 전용 유형 칩 */
  variant?: "media" | "network";
  networkType?: string;
  onNetworkTypeChange?: (v: string) => void;
};

export function MediaManualBrowseFilters({
  isKo = true,
  query,
  onQueryChange,
  mainCategory,
  onMainCategoryChange,
  subCategory,
  onSubCategoryChange,
  target,
  onTargetChange,
  regionMain,
  onRegionMainChange,
  regionSub,
  onRegionSubChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  features,
  onFeaturesChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  loading = false,
  selectedCount = 0,
  selectionVariant = "default",
  onSelectedSummaryClick,
  compareCount = 0,
  cartCount = 0,
  showSectionHeader = false,
  sectionEyebrow = "Manual Browse",
  sectionTitle,
  sectionDesc,
  toolbarEnd,
  className,
  variant = "media",
  networkType = "",
  onNetworkTypeChange,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  /** 모바일 필터 바텀시트 */
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeMain = MEDIA_CATEGORIES.find((m) => m.id === mainCategory);
  const activeRegion = MEDIA_BROWSE_REGIONS.find((r) => r.id === regionMain);

  // "네트워크 매체" 분류 칩은 전용 /media/network 탭과 중복되어 혼동 → 매체유형 목록에서 제외
  const mediaTypeCategories = MEDIA_CATEGORIES.filter((m) => m.id !== "network");

  const activeFilterCount = [
    variant === "network" ? networkType : mainCategory,
    variant === "media" ? subCategory : "",
    variant === "media" ? target : "",
    regionMain,
    regionSub,
    priceMin,
    priceMax,
    variant === "media" ? features : "",
  ].filter(Boolean).length;

  const total = totalCount;

  const resultLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : isKo
      ? variant === "network"
        ? `네트워크 ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개`
        : `매체 ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개`
      : variant === "network"
        ? `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""} networks`
        : `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""} media`;

  // 바텀시트 "결과 보기" 버튼 라벨
  const sheetCtaLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : isKo
      ? `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개 결과 보기`
      : `Show ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}`;

  const toggleFeature = (value: string) => {
    const parts = new Set(
      features
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
    if (parts.has(value)) parts.delete(value);
    else parts.add(value);
    onFeaturesChange([...parts].join(","));
  };

  const featureSet = new Set(
    features
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const clearAllFilters = () => {
    onMainCategoryChange("");
    onSubCategoryChange("");
    onTargetChange("");
    onRegionMainChange("");
    onRegionSubChange("");
    onPriceMinChange("");
    onPriceMaxChange("");
    onFeaturesChange("");
    if (variant === "network") onNetworkTypeChange?.("");
  };

  // 바텀시트 열림 동안 배경 스크롤 잠금
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  // 모든 필터 축 — 데스크탑 인라인(가로 스크롤 유지) + 모바일 바텀시트(줄바꿈, 잘림 없음) 공용
  const renderFilterAxes = (wrap: boolean) => {
    const chipRow = wrap
      ? "flex flex-wrap gap-2 pb-1"
      : "scrollbar-hide flex gap-2 overflow-x-auto pb-1";
    return (
    <>
      <div data-screenshot="media-main-category">
        <p className="tkad-home-accent-text mb-2 text-xs font-bold">
          {isKo
            ? variant === "network"
              ? "네트워크 유형"
              : "어떤 매체?"
            : variant === "network"
              ? "Network type"
              : "Media type"}
        </p>
        <div className={chipRow}>
          {variant === "network"
            ? NETWORK_BROWSE_TYPE_CHIPS.map((chip) => {
                const Icon = MAIN_ICONS[chip.icon] ?? Network;
                const selected = networkType === chip.value;
                return (
                  <button
                    key={chip.value || "all"}
                    type="button"
                    onClick={() =>
                      onNetworkTypeChange?.(selected ? "" : chip.value)
                    }
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {isKo ? chip.labelKo : chip.labelEn}
                  </button>
                );
              })
            : mediaTypeCategories.map((main) => {
                const Icon = MAIN_ICONS[main.icon] ?? Monitor;
                const selected = mainCategory === main.id;
                return (
                  <button
                    key={main.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        onMainCategoryChange("");
                        onSubCategoryChange("");
                      } else {
                        onMainCategoryChange(main.id);
                        onSubCategoryChange("");
                      }
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                      selected
                        ? MAIN_COLOR_ACTIVE[main.color] ?? MEDIA_CHIP_ACTIVE
                        : MEDIA_CHIP_INACTIVE,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {isKo ? main.label : main.labelEn ?? main.label}
                  </button>
                );
              })}
        </div>

        {variant === "media" && activeMain && activeMain.id !== "network" ? (
          <div
            className="mt-2 flex flex-wrap gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-2 dark:border-white/10 dark:bg-white/5"
            data-screenshot="media-sub-category"
          >
            {activeMain.sub.map((sub) => {
              const selected = subCategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSubCategoryChange(selected ? "" : sub.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all",
                    selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                  )}
                >
                  {isKo ? sub.label : sub.labelEn ?? sub.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {variant === "media" ? (
        <div>
          <p className="mb-2 text-xs font-bold text-pink-600 dark:text-pink-400">
            {isKo ? "광고 목적" : "Campaign goal"}
          </p>
          <div className={chipRow}>
            {MEDIA_TARGET_CHIPS.map((chip) => (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() =>
                  onTargetChange(target === chip.value ? "" : chip.value)
                }
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  target === chip.value
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
                )}
              >
                <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div data-screenshot="media-region-filter">
        <p className="mb-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {isKo ? "어디서?" : "Where"}
        </p>
        <div className={chipRow}>
          {MEDIA_BROWSE_REGIONS.map((main) => {
            const selected = regionMain === main.id;
            return (
              <button
                key={main.id}
                type="button"
                onClick={() => {
                  if (selected) {
                    onRegionMainChange("");
                    onRegionSubChange("");
                  } else {
                    onRegionMainChange(main.id);
                    onRegionSubChange("");
                  }
                }}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  selected
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
                )}
              >
                {isKo ? main.label : main.labelEn ?? main.label}
              </button>
            );
          })}
        </div>

        {activeRegion ? (
          <div className="mt-2 flex flex-wrap gap-2 rounded-xl border border-cyan-100 bg-cyan-50/50 p-2 dark:border-cyan-500/20 dark:bg-cyan-500/5">
            {activeRegion.sub.map((sub) => {
              const selected = regionSub === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onRegionSubChange(selected ? "" : sub.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all",
                    selected
                      ? "bg-cyan-500 text-white"
                      : "bg-white text-gray-600 dark:bg-white/10 dark:text-white/70",
                  )}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
        >
          <span>{isKo ? "추가 필터" : "More filters"}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </button>

        {advancedOpen ? (
          <div className="mt-2 space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-[10px] font-medium text-gray-500 dark:text-white/45">
                  {isKo ? "최소 가격(원)" : "Min price (KRW)"}
                </span>
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => onPriceMinChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/8 dark:text-white"
                  placeholder="0"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-medium text-gray-500 dark:text-white/45">
                  {isKo ? "최대 가격(원)" : "Max price (KRW)"}
                </span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => onPriceMaxChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-white/8 dark:text-white"
                  placeholder="∞"
                />
              </label>
            </div>
            {variant === "media" ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-gray-500 dark:text-white/45">
                  {isKo ? "매체 특성" : "Features"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {FEATURE_CHIPS.map((chip) => {
                    const selected = featureSet.has(chip.value);
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() => toggleFeature(chip.value)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-all",
                          selected ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                        )}
                      >
                        {isKo ? chip.labelKo : chip.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
    );
  };

  return (
    <div
      className={cn("min-w-0 space-y-3", className)}
      data-screenshot="media-browse-filters"
    >
      {showSectionHeader ? (
        <div className="space-y-2 border-b border-gray-100 pb-4 dark:border-white/10">
          <PlannerNeonLabel>{sectionEyebrow}</PlannerNeonLabel>
          {sectionTitle ? (
            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {sectionTitle}
            </h3>
          ) : null}
          {sectionDesc ? (
            <p className="text-sm text-gray-600 dark:text-white/65">
              {sectionDesc}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-white/30"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={
            isKo
              ? variant === "network"
                ? "네트워크명·지역·유형 검색"
                : "매체명·지역·유형 검색"
              : "Search name, region, type"
          }
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/35 dark:border-white/10 dark:bg-white/8 dark:text-white dark:placeholder-white/30"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={isKo ? "검색어 지우기" : "Clear search"}
          >
            <X className="h-4 w-4 text-gray-400 dark:text-white/40" />
          </button>
        ) : null}
      </div>

      {/* 데스크탑: 필터 축 인라인 노출 */}
      <div className="hidden space-y-3 sm:block">{renderFilterAxes(false)}</div>

      {/* 컨트롤 툴바: [필터(모바일)] · [정렬] · [보기] · toolbarEnd */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80 sm:hidden"
          aria-label={isKo ? "필터 열기" : "Open filters"}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {isKo ? "필터" : "Filters"}
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label={isKo ? "정렬" : "Sort"}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 focus:outline-none sm:w-auto sm:flex-none dark:border-white/10 dark:bg-white/8 dark:text-white/70"
        >
          {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div
          className="scrollbar-hide flex min-w-0 shrink-0 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10"
          data-screenshot="media-view-mode"
        >
          {VIEW_MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onViewModeChange(mode.id)}
                title={isKo ? mode.labelKo : mode.labelEn}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all",
                  viewMode === mode.id ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">
                  {isKo ? mode.labelKo : mode.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        {toolbarEnd}
      </div>

      {/* 필터 초기화 — 데스크탑 전용(모바일은 바텀시트 하단 버튼) */}
      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={clearAllFilters}
          className="hidden items-center gap-1 text-xs text-rose-400 sm:flex"
        >
          <X className="h-3 w-3" aria-hidden />
          {isKo
            ? `필터 초기화 (${activeFilterCount})`
            : `Clear filters (${activeFilterCount})`}
        </button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-white/50">{resultLabel}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {selectedCount > 0 ? (
            onSelectedSummaryClick ? (
              <button
                type="button"
                onClick={onSelectedSummaryClick}
                className="font-medium text-violet-600 underline decoration-violet-400/50 underline-offset-2 hover:text-violet-500 dark:text-violet-300 dark:hover:text-violet-200"
              >
                {selectionVariant === "plan"
                  ? isKo
                    ? `선택됨 ${selectedCount}개 · 보기`
                    : `${selectedCount} selected · view`
                  : isKo
                    ? `선택 ${selectedCount} · 보기`
                    : `${selectedCount} selected · view`}
              </button>
            ) : (
              <span className="font-medium text-violet-600 dark:text-violet-300">
                {selectionVariant === "plan"
                  ? isKo
                    ? `선택됨 ${selectedCount}개`
                    : `${selectedCount} selected`
                  : isKo
                    ? `선택 ${selectedCount}`
                    : `${selectedCount} selected`}
              </span>
            )
          ) : null}
          {cartCount > 0 ? (
            <span className="tkad-home-accent-text font-medium">
              {isKo ? `담김 ${cartCount}` : `${cartCount} in cart`}
            </span>
          ) : null}
          {compareCount > 0 ? (
            <span className="font-medium text-gray-700 dark:text-white">
              {isKo ? `비교 ${compareCount}` : `${compareCount} compare`}
            </span>
          ) : null}
        </div>
      </div>

      {/* 모바일 필터 바텀시트 */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={isKo ? "필터 닫기" : "Close filters"}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-gray-200 bg-white dark:border-white/10 dark:bg-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {isKo ? "필터" : "Filters"}
                {activeFilterCount > 0 ? (
                  <span className="ml-1.5 text-sm font-semibold text-violet-500">
                    {activeFilterCount}
                  </span>
                ) : null}
              </p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={isKo ? "닫기" : "Close"}
              >
                <X className="h-5 w-5 text-gray-500 dark:text-white/50" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {renderFilterAxes(true)}
            </div>

            <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
              >
                {isKo ? "초기화" : "Reset"}
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="tkad-neon-cta-clean flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              >
                {sheetCtaLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
