"use client";

import { Filter, LayoutList, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const MEDIA_MOBILE_BOTTOM_BAR_SLOT_ID = "tkad-media-mobile-bottom-bar-slot";

export type MediaMobileViewSegment = "list" | "map";

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
        "border-t border-border/80 bg-card/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md",
        "dark:border-white/10 dark:bg-[#0a0a12]/95 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]",
        "pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
      aria-label={isKo ? "매체 탐색 도구" : "Media browse tools"}
    >
      <div className="grid h-14 grid-cols-3 divide-x divide-border/70 dark:divide-white/10">
        <div className="flex min-w-0 items-stretch p-1">
          <div className="flex w-full overflow-hidden rounded-xl border border-border/70 bg-muted/40 p-0.5 dark:border-white/10 dark:bg-white/5">
            <button
              type="button"
              onClick={() => onViewSegmentChange?.("list")}
              className={cn(
                "tkad-type-meta flex flex-1 items-center justify-center gap-1 rounded-lg font-semibold transition-colors",
                viewSegment === "list"
                  ? "bg-card text-foreground shadow-sm dark:bg-white/12"
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
                "tkad-type-meta flex flex-1 items-center justify-center gap-1 rounded-lg font-semibold transition-colors",
                viewSegment === "map"
                  ? "bg-card text-foreground shadow-sm dark:bg-white/12"
                  : "text-tkad-muted",
              )}
              aria-pressed={viewSegment === "map"}
            >
              <MapIcon className="h-4 w-4 shrink-0" aria-hidden />
              {isKo ? "지도" : "Map"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          className="tkad-type-meta relative flex flex-col items-center justify-center gap-0.5 font-semibold text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70 dark:hover:bg-white/5"
          aria-label={isKo ? "필터" : "Filters"}
        >
          <span className="relative inline-flex">
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            {activeFilterCount > 0 ? (
              <span className="tkad-type-note absolute -right-2 -top-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-500 px-1 font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </span>
          <span>{isKo ? "필터" : "Filter"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSort}
          className="tkad-type-meta flex flex-col items-center justify-center gap-0.5 font-semibold text-foreground transition-colors hover:bg-muted/50 active:bg-muted/70 dark:hover:bg-white/5"
          aria-label={isKo ? "정렬" : "Sort"}
        >
          <Filter className="h-5 w-5 rotate-90" aria-hidden />
          <span className="max-w-[5.5rem] truncate px-1">
            {sortLabel ?? (isKo ? "정렬" : "Sort")}
          </span>
        </button>
      </div>
    </nav>
  );
}
