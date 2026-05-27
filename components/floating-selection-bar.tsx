"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  /** 접근성: 스크린 리더용 영역 이름 */
  ariaLabel: string;
  children: ReactNode;
  /** 하단 바 래퍼 (motion)에 합쳐지는 클래스 — 브루탈리스트 등 룩 오버라이드 */
  className?: string;
  /** 견적·플래너 네온 페이지용 다크 글래스 바 */
  variant?: "default" | "neon";
  /** 지도 등 — 패딩·높이 축소 */
  compact?: boolean;
  /** 모바일 하단 탭·퀵액션 바 위에 표시 (가림 방지) */
  aboveMobileChrome?: boolean;
};

/** 바가 열렸을 때 본문 하단에 넣는 여백(콘텐츠가 가려지지 않도록). */
export const FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS =
  "h-[7.25rem] bg-transparent sm:h-[6.75rem]";

/** 컴팩트(지도 등) 하단 바용 여백 */
export const FLOATING_SELECTION_BAR_COMPACT_SPACER_CLASS =
  "h-[4.75rem] bg-transparent sm:h-[3.75rem]";

/**
 * 매체 비교/견적 등 선택 시 하단 고정 바.
 * 나타날 때 슬라이드업, 사라질 때 슬라이드다운 (AnimatePresence).
 * 푸터가 보이면 자동으로 숨김.
 */
export function FloatingSelectionBar({
  open,
  ariaLabel,
  children,
  className,
  variant = "default",
  compact = false,
  aboveMobileChrome = false,
}: Props) {
  const [footerOverlap, setFooterOverlap] = useState(0);
  const [mobileChromeHeight, setMobileChromeHeight] = useState(0);

  useEffect(() => {
    const check = () => {
      const footer = document.getElementById("site-footer");
      if (!footer) return;
      const rect = footer.getBoundingClientRect();
      const overlap = Math.max(0, window.innerHeight - rect.top);
      setFooterOverlap(overlap);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  useEffect(() => {
    if (!aboveMobileChrome) {
      setMobileChromeHeight(0);
      return;
    }

    const measure = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setMobileChromeHeight(0);
        return;
      }
      const tab = document.querySelector(
        'nav[aria-label*="하단 탭"], nav[aria-label*="Bottom tab"]',
      ) as HTMLElement | null;
      const quick = document.querySelector(
        '[data-screenshot="quick-actions-mobile"]',
      ) as HTMLElement | null;
      if (tab && quick) {
        setMobileChromeHeight(tab.offsetHeight + quick.offsetHeight);
        return;
      }
      // fallback: tab h-16 + quick action row
      setMobileChromeHeight(120);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [aboveMobileChrome, open]);

  const visible = open;

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="floating-selection-bar"
          role="region"
          aria-label={ariaLabel}
          initial={{ y: "100%", opacity: 0.98 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.98 }}
          transition={{
            type: "spring",
            damping: 34,
            stiffness: 400,
            mass: 0.85,
          }}
          className={cn(
            "fixed left-0 right-0 z-[60]",
            variant === "neon"
              ? [
                  "border-t border-gray-200 bg-white/98 backdrop-blur-md dark:border-white/12 dark:bg-[#05050a]/92",
                  compact
                    ? "shadow-[0_-8px_24px_-6px_rgba(15,23,42,0.12)] dark:shadow-[0_-12px_32px_-8px_rgba(0,0,0,0.55)]"
                    : "shadow-[0_-16px_48px_-8px_rgba(0,0,0,0.65)]",
                  "text-foreground",
                ]
              : [
                  "bg-white/95 backdrop-blur-sm border-t border-navy/10",
                  "shadow-[0_-8px_32px_-4px_rgba(15,23,42,0.12)]",
                ],
            compact ? "px-2 pb-1 sm:px-3 sm:pb-1.5" : "px-2 pb-2 sm:px-4 sm:pb-3",
            className,
          )}
          style={{ bottom: footerOverlap + mobileChromeHeight }}
        >
          <div
            className={cn(
              "pointer-events-auto mx-auto max-w-7xl",
              compact
                ? aboveMobileChrome
                  ? "px-2 pt-2 pb-2 sm:px-3 sm:py-2"
                  : "px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:px-3 sm:py-2 sm:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
                : "px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3 sm:pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]",
            )}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
