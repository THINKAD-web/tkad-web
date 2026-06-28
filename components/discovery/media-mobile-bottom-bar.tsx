"use client";

import { Filter, LayoutList, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID = "tkad-media-mobile-bottom-bar-slot";

export type MediaMobileViewSegment = "list" | "map";

const MOBILE_TOOLBAR_BTN =
  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10";

type Props = {
  isKo?: boolean;
  activeFilterCount?: number;
  sortLabel?: string;
  viewSegment?: MediaMobileViewSegment;
  onViewSegmentChange?: (segment: MediaMobileViewSegment) => void;
  onOpenFilters: () => void;
  onOpenSort: () => void;
  className?: string;
};

export function MediaMobileBottomBar({
  isKo = true,
  activeFilterCount = 0,
  sortLabel,
  viewSegment = "list",
  onViewSegmentChange,
  onOpenFilters,
  onOpenSort,
  className,
}: Props) {
  return (
    <nav
      className={cn(
        "border-t border-gray-200/80 bg-gray-50/95 backdrop-blur-md",
        "dark:border-white/10 dark:bg-[#020202]/95",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
      aria-label={isKo ? "매체 탐색 도구" : "Media browse tools"}
      data-screenshot="media-mobile-bottom-bar"
    >
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5">
          <button
            type="button"
            onClick={() => onViewSegmentChange?.("list")}
            className={cn(
              "tkad-type-meta flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition-colors",
              viewSegment === "list"
                ? "bg-gray-50 text-foreground shadow-sm dark:bg-white/12"
                : "text-tkad-muted",
            )}
            aria-pressed={viewSegment === "list"}
          >
            <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
            {isKo ? "목록" : "List"}
          </button>
          <button
            type="button"
            onClick={() => onViewSegmentChange?.("map")}
            className={cn(
              "tkad-type-meta flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 font-semibold transition-colors",
              viewSegment === "map"
                ? "bg-gray-50 text-foreground shadow-sm dark:bg-white/12"
                : "text-tkad-muted",
            )}
            aria-pressed={viewSegment === "map"}
          >
            <MapIcon className="h-4 w-4 shrink-0" aria-hidden />
            {isKo ? "지도" : "Map"}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          className={cn(MOBILE_TOOLBAR_BTN, "relative px-3 py-2 text-xs")}
          aria-label={isKo ? "필터" : "Filters"}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
          {isKo ? "필터" : "Filter"}
          {activeFilterCount > 0 ? (
            <span className="ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1.5 text-[11px] font-bold leading-none text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onOpenSort}
          className={cn(MOBILE_TOOLBAR_BTN, "max-w-[7.5rem] px-3 py-2 text-xs")}
          aria-label={isKo ? "정렬" : "Sort"}
        >
          <Filter className="h-4 w-4 shrink-0 rotate-90" aria-hidden />
          <span className="truncate">{sortLabel ?? (isKo ? "정렬" : "Sort")}</span>
        </button>
      </div>
    </nav>
  );
}
