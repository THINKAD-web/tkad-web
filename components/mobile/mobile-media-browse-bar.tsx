"use client";

import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { Filter, LayoutGrid, Map as MapIcon, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHorizontalScrollGesture } from "@/lib/use-horizontal-scroll-gesture";
import { RegionImageChips } from "@/components/region/region-image-chips";
import { MediaCategoryBrowseChips } from "@/components/media-category-browse-chips";
import type { BrowseCategoryChip } from "@/lib/media-categories";
import type { MediaCatalogCardLayout } from "@/components/media-catalog-shared";

const SORT_TABS_KO = [
  { value: "default", label: "오늘의 인기" },
  { value: "newest", label: "최신순" },
  { value: "priceAsc", label: "저가순" },
  { value: "ratingDesc", label: "평점순" },
] as const;

const SORT_TABS_EN = [
  { value: "default", label: "Popular" },
  { value: "newest", label: "Newest" },
  { value: "priceAsc", label: "Price ↑" },
  { value: "ratingDesc", label: "Rating" },
] as const;

type Props = {
  isKo: boolean;
  locale: string;
  activeChip: string;
  onChipChange: (chip: string) => void;
  categoryChip: BrowseCategoryChip;
  onCategoryChange: (chip: BrowseCategoryChip) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  onFilterOpen?: () => void;
  cardLayout?: MediaCatalogCardLayout;
  onCardLayoutChange?: (layout: MediaCatalogCardLayout) => void;
  resultCount?: number;
};

export function MobileMediaBrowseBar({
  isKo,
  locale,
  activeChip,
  onChipChange,
  categoryChip,
  onCategoryChange,
  sortBy,
  onSortChange,
  onFilterOpen,
  cardLayout = "compact",
  onCardLayoutChange,
  resultCount,
}: Props) {
  const sortScrollRef = useRef<HTMLUListElement>(null);
  useHorizontalScrollGesture(sortScrollRef);

  const sortTabs = isKo ? SORT_TABS_KO : SORT_TABS_EN;

  return (
    <div className="space-y-4 md:hidden">
      <div className="px-4">
        <MediaCategoryBrowseChips
          locale={locale}
          active={categoryChip}
          onChange={onCategoryChange}
        />
      </div>

      <RegionImageChips
        locale={locale}
        onSelect={onChipChange}
        activeQuery={activeChip}
        className="px-4"
      />

      <ul
        ref={sortScrollRef}
        className="flex list-none gap-2 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sortTabs.map((tab) => {
          const active = sortBy === tab.value;
          return (
            <li key={tab.value} className="shrink-0">
              <button
                type="button"
                onClick={() => onSortChange(tab.value)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-1.5 tkad-type-title transition-colors",
                  active
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70",
                )}
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-2 px-4">
        <span className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white">
          {activeChip || (isKo ? "전국" : "All regions")}
        </span>
        <div className="flex items-center gap-2">
          {onCardLayoutChange ? (
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
              <button
                type="button"
                aria-label={isKo ? "리스트형" : "List view"}
                onClick={() => onCardLayoutChange("compact")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center",
                  cardLayout === "compact"
                    ? "bg-hermes text-white"
                    : "bg-white text-gray-600 dark:bg-gray-950 dark:text-white/70",
                )}
              >
                <Rows3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={isKo ? "그리드형" : "Grid view"}
                onClick={() => onCardLayoutChange("grid")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center border-l border-gray-200 dark:border-white/10",
                  cardLayout === "grid"
                    ? "bg-hermes text-white"
                    : "bg-white text-gray-600 dark:bg-gray-950 dark:text-white/70",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {onFilterOpen ? (
            <button
              type="button"
              onClick={onFilterOpen}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white"
            >
              <Filter className="h-4 w-4" />
              {isKo ? "필터" : "Filter"}
            </button>
          ) : null}
          <Link
            href="/media/map"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 dark:border-white/10 dark:bg-gray-950 dark:text-white"
          >
            <MapIcon className="h-4 w-4 text-hermes" />
            {isKo ? "지도" : "Map"}
          </Link>
        </div>
      </div>

      {resultCount != null ? (
        <p className="px-4 text-xs text-gray-500 dark:text-white/50">
          {isKo ? `${resultCount}개 매체` : `${resultCount} media`}
        </p>
      ) : null}
    </div>
  );
}
