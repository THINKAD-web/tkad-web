"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

/** 매체 카탈로그 썸네일 — 기본 50% 그레이(모바일 가독), 호버·포커스 시 풀 컬러 */
export const MEDIA_CATALOG_THUMB_IMG_FILTER_CLASS =
  "[&_img]:grayscale-[20%] [&_img]:transition-[filter,transform] [&_img]:duration-500 group-hover:[&_img]:grayscale-0 group-focus-within:[&_img]:grayscale-0";

/** 매체 카탈로그 그리드 카드 — 매체검색·견적·비교 공통. 데스크톱은 3열 고정. */
export const MEDIA_CATALOG_GRID_CLASS =
  "grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3";

/** 컴팩트 행 그리드 — 매체검색·견적·비교 공통 */
export const MEDIA_CATALOG_COMPACT_GRID_CLASS =
  "grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3";

/** 컴팩트 행(링크/선택) 외곽 — 시각 통일.
 *  Phase 3: 2px 검정 보더 + 사각, 호버 시 off bg. 그리드 컨테이너에서 -mt/-ml 로 보더 겹침 처리. */
export const MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS =
  "relative -mt-[2px] -ml-[2px] flex min-w-0 items-center gap-3 border-2 border-border bg-card p-3 transition-colors hover:bg-muted sm:gap-4 sm:p-4";

export function MediaCatalogStickyAside({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="sticky top-24 space-y-4 border-2 border-border bg-card p-6">
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
        "inline-flex h-10 border-2 border-border bg-card",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onLayoutChange("grid")}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 px-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
          layout === "grid"
            ? "bg-hero-void text-hero-fg"
            : "text-foreground hover:bg-muted",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        {gridLabel}
      </button>
      <button
        type="button"
        onClick={() => onLayoutChange("compact")}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 border-l-2 border-border px-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
          layout === "compact"
            ? "bg-hero-void text-hero-fg"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Rows3 className="h-3.5 w-3.5" />
        {compactLabel}
      </button>
    </div>
  );
}
