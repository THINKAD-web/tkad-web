"use client";

import { useCallback, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AnchoredOverlayPortal,
  anchoredPlacementBelowTriggerLeft,
} from "@/components/ui/anchored-overlay-portal";
import { MAP_TOOLBAR_CTRL } from "@/components/media-map/map-toolbar-control-styles";
import { MEDIA_SEARCH_SORT_OPTIONS } from "@/lib/media-discovery-filter-chips";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/** `/media/map` — native select 대신 툴바 높이(h-9)에 맞는 정렬 드롭다운 */
export function MapToolbarSortDropdown({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getPlacement = useCallback(
    (anchor: HTMLElement) => anchoredPlacementBelowTriggerLeft(anchor, 160),
    [],
  );

  const active =
    MEDIA_SEARCH_SORT_OPTIONS.find((opt) => opt.value === value) ??
    MEDIA_SEARCH_SORT_OPTIONS[0];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(MAP_TOOLBAR_CTRL, "max-w-[8.5rem]", className)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="정렬"
      >
        <span className="min-w-0 truncate">{active.label}</span>
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
        closeAriaLabel="닫기"
        dialogAriaLabel="정렬"
        panelClassName="overflow-y-auto rounded-xl border border-border/80 bg-card py-1 shadow-lg dark:border-white/12 dark:bg-[#0a0a12]"
      >
        <ul role="listbox" className="min-w-[9.5rem]">
          {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "tkad-type-meta w-full px-3 py-2 text-left",
                    selected
                      ? "bg-[color:var(--qp-accent-soft)] font-semibold text-[color:var(--qp-accent)]"
                      : "text-foreground hover:bg-muted/50",
                  )}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      </AnchoredOverlayPortal>
    </>
  );
}
