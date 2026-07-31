import { cn } from "@/lib/utils";

/** `/media/map` 상단 툴바 — 검색·필터·정렬·인기지역·뷰토글 공통 36px */
export const MAP_TOOLBAR_CTRL_H = "h-9";

export const MAP_TOOLBAR_CTRL_BASE = cn(
  "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white",
  "tkad-type-meta font-medium text-gray-700 transition-colors",
  "hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10",
);

export const MAP_TOOLBAR_CTRL = cn(
  MAP_TOOLBAR_CTRL_BASE,
  "px-3 py-0 min-h-9 max-h-9 leading-none",
  MAP_TOOLBAR_CTRL_H,
);

export const MAP_TOOLBAR_CTRL_ACTIVE = cn(
  "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
  "hover:bg-[color:var(--qp-accent-soft)] dark:hover:bg-[color:var(--qp-accent-soft)]",
);

export const MAP_TOOLBAR_SEARCH = cn(
  "box-border w-full min-h-9 max-h-9 rounded-xl border border-gray-200 bg-white pl-9 pr-8",
  "tkad-type-meta text-sm leading-none text-gray-900 placeholder-gray-400",
  "focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/35",
  "dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30",
  MAP_TOOLBAR_CTRL_H,
  "py-0",
);

export const MAP_TOOLBAR_SELECT = cn(
  MAP_TOOLBAR_CTRL_BASE,
  "min-h-9 max-h-9 cursor-pointer appearance-none bg-no-repeat py-0 pl-3 pr-8 leading-none",
  MAP_TOOLBAR_CTRL_H,
  "bg-[length:14px] bg-[right_0.65rem_center]",
  "bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')]",
);

export const MAP_TOOLBAR_ROW = "hidden min-w-0 items-center gap-1.5 md:flex";

export const MAP_TOOLBAR_SEARCH_WRAP = "relative min-w-[8.5rem] max-w-[11rem] flex-1 sm:max-w-[12rem]";

export const MAP_TOOLBAR_SEARCH_ICON =
  "pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/35";

export const MAP_TOOLBAR_VIEW_TOGGLE = cn(
  "scrollbar-hide flex min-w-0 shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-gray-200 dark:ring-white/10",
  MAP_TOOLBAR_CTRL_H,
);
