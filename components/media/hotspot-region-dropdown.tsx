"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  hotspotRegionLabel,
  listMediaHotspotRegions,
} from "@/lib/media-hotspot-regions";
import {
  AnchoredOverlayPortal,
  anchoredPlacementBelowTriggerLeft,
} from "@/components/ui/anchored-overlay-portal";
import { cn } from "@/lib/utils";

type Props = {
  isKo?: boolean;
  regionSub: string;
  onSelect: (regionMain: string, regionSub: string) => void;
  onClear: () => void;
  className?: string;
  compact?: boolean;
};

/** `/media/map` — 인기 지역 compact dropdown (body portal) */
export function HotspotRegionDropdown({
  isKo = true,
  regionSub,
  onSelect,
  onClear,
  className,
  compact = false,
}: Props) {
  const hotspots = listMediaHotspotRegions();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getPlacement = useCallback(
    (anchor: HTMLElement) => anchoredPlacementBelowTriggerLeft(anchor, 176),
    [],
  );

  if (hotspots.length === 0) return null;

  const active = hotspots.find((h) => h.regionSub === regionSub);
  const triggerLabel = active
    ? hotspotRegionLabel(active, isKo)
    : isKo
      ? "인기 지역"
      : "Hot areas";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold transition-colors",
          compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
          active
            ? "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]"
            : "border-border/80 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-white/12 dark:bg-white/10 dark:text-white/80 dark:hover:bg-white/15",
          className,
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="max-w-[8rem] truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnchoredOverlayPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        panelRef={panelRef}
        getPlacement={getPlacement}
        backdropClassName="absolute inset-0 bg-transparent"
        closeAriaLabel={isKo ? "닫기" : "Close"}
        dialogAriaLabel={isKo ? "인기 지역" : "Hot areas"}
        panelClassName="overflow-y-auto rounded-xl border border-border/80 bg-card py-1 shadow-lg dark:border-white/12 dark:bg-[#0a0a12]"
      >
        <ul role="listbox" className="min-w-[11rem]">
          {active ? (
            <li role="option">
              <button
                type="button"
                className="tkad-type-meta w-full px-3 py-2 text-left text-tkad-muted hover:bg-muted/50"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                {isKo ? "선택 해제" : "Clear selection"}
              </button>
            </li>
          ) : null}
          {hotspots.map((h) => {
            const selected = regionSub === h.regionSub;
            return (
              <li key={h.regionSub} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "tkad-type-meta flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
                    selected
                      ? "bg-[color:var(--qp-accent-soft)] font-semibold text-[color:var(--qp-accent)]"
                      : "text-foreground hover:bg-muted/50",
                  )}
                  onClick={() => {
                    if (selected) {
                      onClear();
                    } else {
                      onSelect(h.regionMain, h.regionSub);
                    }
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate">
                    {hotspotRegionLabel(h, isKo)}
                  </span>
                  <span className="shrink-0 tabular-nums text-tkad-muted">
                    {h.mediaCount}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </AnchoredOverlayPortal>
    </>
  );
}
