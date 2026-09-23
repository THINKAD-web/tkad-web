"use client";

import { cn } from "@/lib/utils";
import type { MapAreaSearchMode } from "@/lib/media-map/map-area-search-mode";
import { MAP_TOOLBAR_CTRL } from "@/components/media-map/map-toolbar-control-styles";

type Props = {
  locale?: string;
  /** @deprecated pass `locale` */
  isKo?: boolean;
  mode: MapAreaSearchMode;
  onChange: (mode: MapAreaSearchMode) => void;
  className?: string;
  compact?: boolean;
};

/** 지도 pan/zoom 후 자동 재조회 vs 수동 CTA */
export function MapAreaSearchModeToggle({
  locale,
  isKo,
  mode,
  onChange,
  className,
  compact = false,
}: Props) {
  const useKo =
    locale != null ? locale === "ko" || locale.startsWith("ko") : (isKo ?? true);
  const setMode = (next: MapAreaSearchMode) => {
    if (next !== mode) onChange(next);
  };

  const label = useKo ? "지역 검색" : "Area search";

  if (compact) {
    return (
      <div
        className={cn("flex items-center gap-1", className)}
        data-screenshot="map-area-search-mode-toggle"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          aria-pressed={mode === "manual"}
          onClick={() => setMode("manual")}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
            mode === "manual"
              ? "bg-[color:var(--qp-accent)] !text-white"
              : "text-tkad-muted hover:text-foreground",
          )}
        >
          {useKo ? "수동" : "Manual"}
        </button>
        <button
          type="button"
          aria-pressed={mode === "auto"}
          onClick={() => setMode("auto")}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-medium transition-colors",
            mode === "auto"
              ? "bg-[color:var(--qp-accent)] !text-white"
              : "text-tkad-muted hover:text-foreground",
          )}
        >
          {useKo ? "자동" : "Auto"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-gray-200 dark:ring-white/10",
        className,
      )}
      data-screenshot="map-area-search-mode-toggle"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-pressed={mode === "manual"}
        onClick={() => setMode("manual")}
        className={cn(
          MAP_TOOLBAR_CTRL,
          "rounded-none border-0 px-2.5 shadow-none ring-0",
          mode === "manual"
            ? "bg-[color:var(--qp-accent)] !text-white hover:bg-[color:var(--qp-accent-hover)]"
            : "",
        )}
        title={
          useKo
            ? "지도 이동 후 「이 지역에서 검색」 버튼으로 불러오기"
            : "Load with “Search this area” after panning"
        }
      >
        {useKo ? "수동" : "Manual"}
      </button>
      <button
        type="button"
        aria-pressed={mode === "auto"}
        onClick={() => setMode("auto")}
        className={cn(
          MAP_TOOLBAR_CTRL,
          "rounded-none border-0 px-2.5 shadow-none ring-0",
          mode === "auto"
            ? "bg-[color:var(--qp-accent)] !text-white hover:bg-[color:var(--qp-accent-hover)]"
            : "",
        )}
        title={
          useKo
            ? "지도 이동·줌 후 자동으로 이 영역 매체 불러오기"
            : "Auto-load media when you pan or zoom"
        }
      >
        {useKo ? "자동" : "Auto"}
      </button>
    </div>
  );
}
