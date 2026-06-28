"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { DiscoveryFilterSheetHeader } from "@/components/discovery/filter-bar-parts";
import { MEDIA_SEARCH_SORT_OPTIONS } from "@/lib/media-discovery-filter-chips";

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isKo?: boolean;
  activeFilterCount?: number;
  onReset: () => void;
  applyLabel: string;
  children: ReactNode;
};

/** vaul — 카테고리·상세 필터 (peek / half / full 스냅) */
export function MediaFilterVaulSheet({
  open,
  onOpenChange,
  isKo = true,
  activeFilterCount = 0,
  onReset,
  applyLabel,
  children,
}: FilterSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={["148px", 0.55, 0.92]}
      fadeFromIndex={1}
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/50 md:hidden" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border/80 bg-card outline-none md:hidden",
            "dark:border-white/10 dark:bg-[#0a0a12]",
          )}
        >
          <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />
          <DiscoveryFilterSheetHeader
            isKo={isKo}
            activeFilterCount={activeFilterCount}
            onClose={() => onOpenChange(false)}
          />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t border-border/70 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] dark:border-white/10">
            <button
              type="button"
              onClick={onReset}
              disabled={activeFilterCount === 0}
              className="tkad-type-body rounded-xl border border-border px-4 py-2.5 font-medium text-tkad-secondary disabled:opacity-40 dark:border-white/10"
            >
              {isKo ? "초기화" : "Reset"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="tkad-neon-cta-clean tkad-type-body flex-1 rounded-xl px-4 py-2.5 font-bold text-white"
            >
              {applyLabel}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type SortSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isKo?: boolean;
  sort: string;
  onSortChange: (value: string) => void;
};

/** vaul — 정렬 액션시트 */
export function MediaSortVaulSheet({
  open,
  onOpenChange,
  isKo = true,
  sort,
  onSortChange,
}: SortSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40 md:hidden" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[61] flex flex-col rounded-t-2xl border-t border-border/80 bg-card outline-none md:hidden",
            "dark:border-white/10 dark:bg-[#0a0a12]",
          )}
        >
          <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />
          <p className="tkad-type-title border-b border-border/70 px-4 py-3 text-foreground dark:border-white/10">
            {isKo ? "정렬" : "Sort"}
          </p>
          <ul className="px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {MEDIA_SEARCH_SORT_OPTIONS.map((opt) => {
              const selected = sort === opt.value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSortChange(opt.value);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "tkad-type-body flex w-full items-center justify-between rounded-xl px-4 py-3 text-left font-medium transition-colors",
                      selected
                        ? "bg-violet-500/12 text-tkad-accent"
                        : "text-foreground hover:bg-muted/60 dark:hover:bg-white/5",
                    )}
                    aria-pressed={selected}
                  >
                    {opt.label}
                    {selected ? (
                      <span className="tkad-type-note text-tkad-accent" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
