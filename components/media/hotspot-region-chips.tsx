"use client";

import { listMediaHotspotRegions, hotspotRegionLabel } from "@/lib/media-hotspot-regions";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  regionSub: string;
  onSelect: (regionMain: string, regionSub: string) => void;
  onClear: () => void;
  className?: string;
  /** 지도 immersive 등 컴팩트 패딩 */
  compact?: boolean;
  /** `/media` — 클릭 시 필터 패널을 지역 섹션으로 연다 */
  shortcutToPanel?: boolean;
  onOpenFilterPanel?: () => void;
};

export function HotspotRegionChips({
  isKo = true,
  regionSub,
  onSelect,
  onClear,
  className,
  compact = false,
  shortcutToPanel = false,
  onOpenFilterPanel,
}: Props) {
  const hotspots = listMediaHotspotRegions();
  if (hotspots.length === 0) return null;

  return (
    <div
      className={cn("min-w-0", className)}
      data-screenshot="media-hotspot-regions"
    >
      <p
        className={cn(
          "mb-1.5 font-bold text-[color:var(--qp-accent)]",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {isKo ? "인기 지역" : "Hot areas"}
      </p>
      <div className="scrollbar-hide -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
        {hotspots.map((h) => {
          const active = regionSub === h.regionSub;
          return (
            <button
              key={h.regionSub}
              type="button"
              onClick={() => {
                if (active) {
                  onClear();
                  return;
                }
                if (shortcutToPanel) onOpenFilterPanel?.();
                onSelect(h.regionMain, h.regionSub);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-semibold transition-all",
                compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs sm:text-sm",
                active
                  ? "bg-hermes text-white shadow-sm shadow-hermes/25"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
              )}
              aria-pressed={active}
            >
              {hotspotRegionLabel(h, isKo)}
              <span
                className={cn(
                  "tabular-nums opacity-70",
                  compact ? "text-[9px]" : "text-[10px]",
                )}
              >
                {h.mediaCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
