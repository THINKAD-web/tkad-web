"use client";

import { useEffect, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { DiscoveryFilterSheetHeader } from "@/components/discovery/filter-bar-parts";
import { MEDIA_SEARCH_SORT_OPTIONS } from "@/lib/media-discovery-filter-chips";

/**
 * vaul 의 `modal` 옵션은 내부적으로 react-remove-scroll 을 통해
 * `body[data-scroll-locked]` 에 `overflow:hidden !important` 를 건다 — 이건
 * PART 1 에서 고친 "body 에 overflow:hidden 걸면 스크롤된 상태의 sticky/fixed
 * 헤더가 화면 밖으로 날아가는" 버그와 정확히 같은 메커니즘이다 (desktop-global-nav.tsx
 * 참고). vaul 은 라이브러리 내부 동작이라 우리 쪽 useEffect 로 우회할 수 없으므로,
 * html 에 우리 자신의 (안전한) 잠금을 걸고 globals.css 에서
 * `.tkad-vaul-sticky-fix body[data-scroll-locked]` 를 무력화한다.
 */
function useVaulStickyFix(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    html.classList.add("tkad-vaul-sticky-fix");
    return () => {
      html.style.overflow = prevOverflow;
      html.classList.remove("tkad-vaul-sticky-fix");
    };
  }, [open]);
}

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isKo?: boolean;
  activeFilterCount?: number;
  onReset: () => void;
  applyLabel: string;
  children: ReactNode;
};

/**
 * vaul — 카테고리·상세 필터.
 * snapPoints(148px peek 등)는 시트 전체가 transform으로만 일부 노출되어
 * 하단 CTA가 뷰포트 밖(진단 y≈1485)으로 밀림. 정렬 시트와 같이
 * snap 없이 max-h + flex footer로 열어 CTA를 항상 보이게 함.
 */
export function MediaFilterVaulSheet({
  open,
  onOpenChange,
  isKo = true,
  activeFilterCount = 0,
  onReset,
  applyLabel,
  children,
}: FilterSheetProps) {
  useVaulStickyFix(open);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/50 md:hidden" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[91] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-border/80 bg-card outline-none md:hidden",
            "dark:border-white/10 dark:bg-[#0a0a12]",
          )}
        >
          <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />
          <DiscoveryFilterSheetHeader
            isKo={isKo}
            activeFilterCount={activeFilterCount}
            onClose={() => onOpenChange(false)}
            useDrawerTitle
          />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
            {children}
          </div>
          {/* shrink-0 footer — 시트 가시 영역 하단에 CTA 고정 */}
          <div className="flex shrink-0 items-center gap-2 border-t border-border/70 bg-card px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] dark:border-white/10 dark:bg-[#0a0a12]">
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
  useVaulStickyFix(open);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/40 md:hidden" />
        <Drawer.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[91] flex flex-col rounded-t-2xl border-t border-border/80 bg-card outline-none md:hidden",
            "dark:border-white/10 dark:bg-[#0a0a12]",
          )}
        >
          <Drawer.Handle className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/25" />
          <Drawer.Title className="tkad-type-title border-b border-border/70 px-4 py-3 text-foreground dark:border-white/10">
            {isKo ? "정렬" : "Sort"}
          </Drawer.Title>
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
