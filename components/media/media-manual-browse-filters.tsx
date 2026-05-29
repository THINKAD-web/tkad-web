"use client";

import type { ReactNode } from "react";
import { Search, X, List, LayoutGrid, AlignJustify } from "lucide-react";
import { MediaFilterChipLabel } from "@/components/media/media-filter-chip-label";
import {
  MEDIA_CHIP_ACTIVE,
  MEDIA_CHIP_INACTIVE,
  MEDIA_REGION_CHIPS,
  MEDIA_SEARCH_SORT_OPTIONS,
  MEDIA_TARGET_CHIPS,
  MEDIA_TYPE_CHIPS,
} from "@/lib/media-discovery-filter-chips";
import { PlannerNeonLabel } from "@/components/planner/planner-neon-ui";
import { cn } from "@/lib/utils";

export type MediaManualBrowseViewMode = "feed" | "card" | "compact";

const VIEW_MODES: {
  id: MediaManualBrowseViewMode;
  labelKo: string;
  labelEn: string;
  icon: typeof List;
}[] = [
  { id: "feed", labelKo: "피드", labelEn: "Feed", icon: List },
  { id: "card", labelKo: "카드", labelEn: "Card", icon: LayoutGrid },
  { id: "compact", labelKo: "컴팩트", labelEn: "Compact", icon: AlignJustify },
];

type Props = {
  isKo?: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  target: string;
  onTargetChange: (v: string) => void;
  region: string;
  onRegionChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  viewMode: MediaManualBrowseViewMode;
  onViewModeChange: (mode: MediaManualBrowseViewMode) => void;
  resultCount: number;
  totalCount?: number;
  loading?: boolean;
  selectedCount?: number;
  /** plan: 플래너 Step 4 담김 수 */
  selectionVariant?: "default" | "plan";
  compareCount?: number;
  cartCount?: number;
  /** 플래너 Manual Browse 헤더 */
  showSectionHeader?: boolean;
  sectionEyebrow?: string;
  sectionTitle?: string;
  sectionDesc?: string;
  /** 정렬·뷰 토글 오른쪽 (페이지당 N, 전체선택 등) */
  toolbarEnd?: ReactNode;
  className?: string;
};

export function MediaManualBrowseFilters({
  isKo = true,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  target,
  onTargetChange,
  region,
  onRegionChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  totalCount,
  loading = false,
  selectedCount = 0,
  selectionVariant = "default",
  compareCount = 0,
  cartCount = 0,
  showSectionHeader = false,
  sectionEyebrow = "Manual Browse",
  sectionTitle,
  sectionDesc,
  toolbarEnd,
  className,
}: Props) {
  const activeFilterCount = [category, target, region].filter(Boolean).length;
  const total = totalCount;

  const resultLabel = loading
    ? isKo
      ? "검색 중…"
      : "Searching…"
    : isKo
      ? `매체 ${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""}개`
      : `${resultCount}${total != null && total > resultCount ? ` / ${total}` : ""} media`;

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      {showSectionHeader ? (
        <div className="space-y-2 border-b border-gray-100 pb-4 dark:border-white/10">
          <PlannerNeonLabel>{sectionEyebrow}</PlannerNeonLabel>
          {sectionTitle ? (
            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {sectionTitle}
            </h3>
          ) : null}
          {sectionDesc ? (
            <p className="text-sm text-gray-600 dark:text-white/65">{sectionDesc}</p>
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
            isKo ? "매체명·지역·유형 검색" : "Search name, region, type"
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

      <div>
        <p className="tkad-home-accent-text mb-2 text-xs font-bold">
          {isKo ? "어떤 매체?" : "Media type"}
        </p>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {MEDIA_TYPE_CHIPS.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() =>
                onCategoryChange(category === chip.value ? "" : chip.value)
              }
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                category === chip.value ? MEDIA_CHIP_ACTIVE : MEDIA_CHIP_INACTIVE,
              )}
            >
              <MediaFilterChipLabel label={chip.label} icon={chip.icon} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-pink-600 dark:text-pink-400">
          {isKo ? "왜 광고해?" : "Campaign goal"}
        </p>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {MEDIA_TARGET_CHIPS.map((chip) => (
            <button
              key={chip.value || "all"}
              type="button"
              onClick={() => onTargetChange(target === chip.value ? "" : chip.value)}
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

      <div>
        <p className="mb-2 text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {isKo ? "어디서?" : "Where"}
        </p>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
            {MEDIA_REGION_CHIPS.map((chip) => (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() => onRegionChange(region === chip.value ? "" : chip.value)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
                  region === chip.value
                    ? "bg-cyan-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-white/8 dark:text-white/70",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 self-end sm:self-auto">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label={isKo ? "정렬" : "Sort"}
              className="flex-shrink-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm text-gray-600 focus:outline-none dark:border-white/10 dark:bg-white/8 dark:text-white/70"
            >
              {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div
              className="flex flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10"
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
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            onCategoryChange("");
            onTargetChange("");
            onRegionChange("");
          }}
          className="flex items-center gap-1 text-xs text-rose-400"
        >
          <X className="h-3 w-3" aria-hidden />
          {isKo ? `필터 초기화 (${activeFilterCount})` : `Clear filters (${activeFilterCount})`}
        </button>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-white/50">{resultLabel}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {selectedCount > 0 ? (
            <span className="font-medium text-violet-600 dark:text-violet-300">
              {selectionVariant === "plan"
                ? isKo
                  ? `플랜에 담김 ${selectedCount}개`
                  : `${selectedCount} in plan`
                : isKo
                  ? `선택 ${selectedCount}`
                  : `${selectedCount} selected`}
            </span>
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
    </div>
  );
}
