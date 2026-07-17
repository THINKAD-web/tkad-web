"use client";

import { motion } from "framer-motion";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type StickyActionBarLayout = "dock" | "floating";
export type StickyActionBarVariant = "default" | "neon";

type Props = {
  open: boolean;
  ariaLabel: string;
  children: ReactNode;
  /** dock = 전폭 하단 바, floating = 둥근 카드(플래너 위저드) */
  layout?: StickyActionBarLayout;
  variant?: StickyActionBarVariant;
  compact?: boolean;
  aboveMobileChrome?: boolean;
  /** 스크롤 시 site-footer 위로 올림 (floating 포함) */
  respectFooter?: boolean;
  /** `document.body`에 포털 — locale 템플릿 transform 하위 fixed 깨짐 방지 */
  portal?: boolean;
  className?: string;
  /** dock 레이아웃 내부 래퍼 (페이지 본문 px·max-width 맞출 때) */
  innerClassName?: string;
  /** floating 레이아웃 내부 max-width */
  maxWidthClass?: string;
};

/** dock 바가 열렸을 때 본문 하단 여백 */
export const STICKY_ACTION_BAR_DOCK_SPACER_CLASS =
  "h-[4.25rem] bg-transparent sm:h-[6.75rem]";

export const STICKY_ACTION_BAR_DOCK_COMPACT_SPACER_CLASS =
  "h-[4.75rem] bg-transparent sm:h-[3.75rem]";

/** 레거시 import 호환 */
export const FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS =
  STICKY_ACTION_BAR_DOCK_SPACER_CLASS;
export const FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS =
  STICKY_ACTION_BAR_DOCK_COMPACT_SPACER_CLASS;
export const FLOATING_SELECTION_BAR_COMPACT_BOTTOM_CLASS =
  "bottom-[calc(3.75rem+1rem)]";

/** 하단 액션 바 — 페이지 간 동일 한 줄 버튼 토큰 */
export const STICKY_ACTION_BAR_ROW =
  "mx-auto flex w-full max-w-lg items-center gap-1.5";

export const STICKY_ACTION_BAR_BTN =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold leading-none transition active:scale-95";

export const STICKY_ACTION_BAR_BTN_IDLE =
  "border-gray-200 bg-white text-gray-800 dark:border-white/12 dark:bg-white/10 dark:text-white/90";

export const STICKY_ACTION_BAR_BTN_PRIMARY =
  "border-0 bg-[color:var(--qp-accent)] font-semibold text-white hover:bg-[color:var(--qp-accent-hover)]";

export const STICKY_ACTION_BAR_BTN_VIOLET =
  "border-violet-500/40 bg-violet-500 text-white shadow-sm shadow-violet-500/25";

export const STICKY_ACTION_BAR_BTN_DISABLED =
  "border-gray-200 bg-white text-gray-800 opacity-45 dark:border-white/12 dark:bg-white/10 dark:text-white/90";

const TRANSITION = {
  type: "tween" as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

function useThrottledFooterOverlap(enabled: boolean) {
  const [overlap, setOverlap] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOverlap(0);
      return;
    }

    const measure = () => {
      const footer = document.getElementById("site-footer");
      if (!footer) {
        setOverlap(0);
        return;
      }
      const style = window.getComputedStyle(footer);
      if (style.display === "none" || style.visibility === "hidden") {
        setOverlap(0);
        return;
      }
      const rect = footer.getBoundingClientRect();
      if (rect.height <= 0) {
        setOverlap(0);
        return;
      }
      const next = Math.max(0, window.innerHeight - rect.top);
      setOverlap((prev) => (Math.abs(prev - next) < 2 ? prev : next));
    };

    const onScrollOrResize = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        measure();
      });
    };

    measure();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [enabled]);

  return overlap;
}

function useMobileChromeHeight(enabled: boolean) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setHeight(0);
      return;
    }

    const measure = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setHeight(0);
        return;
      }
      const tab = document.querySelector(
        'nav[aria-label*="하단 탭"], nav[aria-label*="Bottom tab"]',
      ) as HTMLElement | null;
      setHeight(tab?.offsetHeight ?? 68);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [enabled]);

  return height;
}

/**
 * 화면 하단 고정 액션 바 — 항상 마운트, opacity/translate 로 등장·퇴장(깜빡임 완화).
 * 플래너(floating) · 매체 비교/상세(dock) 공용.
 */
export function StickyActionBar({
  open,
  ariaLabel,
  children,
  layout = "dock",
  variant = "default",
  compact = false,
  aboveMobileChrome = false,
  respectFooter = false,
  portal = true,
  className,
  innerClassName,
  maxWidthClass = "max-w-3xl",
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const footerOverlap = useThrottledFooterOverlap(
    open && (layout === "dock" || respectFooter),
  );
  const mobileChromeHeight = useMobileChromeHeight(aboveMobileChrome && open);

  const baseBottom =
    footerOverlap > 0
      ? footerOverlap
      : aboveMobileChrome
        ? mobileChromeHeight
        : 0;

  const floatingGap = layout === "floating" ? 12 : 0;
  const barBottom = baseBottom + floatingGap;

  const dockSurface =
    variant === "neon"
      ? cn(
          "border-t border-gray-200 bg-white/98 backdrop-blur-md dark:border-white/12 dark:bg-[#05050a]/92",
          compact
            ? "shadow-[0_-8px_24px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.55)]"
            : "shadow-[0_-16px_48px_-8px_rgba(0,0,0,0.65)]",
          "text-foreground",
        )
      : cn(
          "border-t border-navy/10 bg-white/95 backdrop-blur-sm",
          "shadow-[0_-8px_32px_-4px_rgba(15,23,42,0.12)]",
        );

  const floatingSurface = cn(
    "rounded-2xl border border-violet-400/20 bg-background/95 shadow-lg backdrop-blur-md",
    "dark:border-violet-400/25 dark:bg-[#0a0a0f]/95",
  );

  const bar = (
    <motion.div
      role="region"
      aria-label={ariaLabel}
      aria-hidden={!open}
      initial={false}
      animate={{
        y: open ? 0 : 24,
        opacity: open ? 1 : 0,
      }}
      transition={TRANSITION}
      className={cn(
        "fixed left-0 right-0 z-[70]",
        !open && "pointer-events-none",
        layout === "floating" ? "px-4" : dockSurface,
        layout === "dock" &&
          (compact ? "px-2 pb-1 sm:px-3 sm:pb-1.5" : "px-2 pb-2 sm:px-4 sm:pb-3"),
        className,
      )}
      style={{ bottom: barBottom }}
    >
      <div
        className={cn(
          layout === "floating"
            ? cn("pointer-events-auto mx-auto", maxWidthClass)
            : cn(
                "pointer-events-auto mx-auto w-full min-w-0 max-w-7xl",
                innerClassName ??
                  (compact
                    ? aboveMobileChrome
                      ? "px-2 pt-2 pb-2 sm:px-3 sm:py-2"
                      : "px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:px-3 sm:py-2 sm:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
                    : "px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3 sm:pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]"),
              ),
        )}
      >
        {layout === "floating" ? (
          <div className={cn("p-3 sm:p-4", floatingSurface)}>{children}</div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );

  if (portal) {
    if (!mounted) return null;
    return createPortal(bar, document.body);
  }

  return bar;
}

/** dock 바 열림 시 본문 하단 여백 — grid-rows 로 높이 전환(레이아웃 점프 완화) */
export function StickyActionBarSpacer({
  open,
  compact = false,
  className,
}: {
  open: boolean;
  compact?: boolean;
  className?: string;
}) {
  const spacerClass =
    className ??
    (compact
      ? STICKY_ACTION_BAR_DOCK_COMPACT_SPACER_CLASS
      : STICKY_ACTION_BAR_DOCK_SPACER_CLASS);

  return (
    <div
      aria-hidden
      className={cn(
        "grid transition-[grid-template-rows] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className={spacerClass} />
      </div>
    </div>
  );
}
