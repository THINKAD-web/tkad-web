"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

/** 매체 카탈로그 그리드 카드 — 매체검색·견적·비교 공통 */
export const MEDIA_CATALOG_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** 컴팩트 행 그리드 — 매체검색·견적·비교 공통 */
export const MEDIA_CATALOG_COMPACT_GRID_CLASS =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3";

/** 컴팩트 행(링크/선택) 외곽 — 시각 통일 */
export const MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS =
  "relative flex min-w-0 rounded-lg border border-navy/10 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:rounded-xl sm:p-3.5";

export function MediaCatalogStickyAside({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="sticky top-24 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        {children}
      </div>
    </aside>
  );
}

export type MediaCatalogCardLayout = "grid" | "compact";

export function MediaCatalogGridCompactToggle({
  layout,
  onLayoutChange,
  gridLabel,
  compactLabel,
  className,
}: {
  layout: MediaCatalogCardLayout;
  onLayoutChange: (v: MediaCatalogCardLayout) => void;
  gridLabel: string;
  compactLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-navy/15 bg-slate-50 p-0.5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onLayoutChange("grid")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
          layout === "grid"
            ? "bg-white text-navy shadow-sm"
            : "text-muted-foreground hover:text-navy",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {gridLabel}
      </button>
      <button
        type="button"
        onClick={() => onLayoutChange("compact")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
          layout === "compact"
            ? "bg-white text-navy shadow-sm"
            : "text-muted-foreground hover:text-navy",
        )}
      >
        <Rows3 className="h-3.5 w-3.5" />
        {compactLabel}
      </button>
    </div>
  );
}
