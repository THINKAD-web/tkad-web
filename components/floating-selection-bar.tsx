"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  /** 접근성: 스크린 리더용 영역 이름 */
  ariaLabel: string;
  children: ReactNode;
};

/** 바가 열렸을 때 본문 하단에 넣는 여백(콘텐츠가 가려지지 않도록). */
export const FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS =
  "h-[7.25rem] sm:h-[6.75rem]";

/**
 * 매체 비교/견적 등 선택 시 하단 고정 바.
 * 나타날 때 슬라이드업, 사라질 때 슬라이드다운 (AnimatePresence).
 */
export function FloatingSelectionBar({ open, ariaLabel, children }: Props) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
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
            "fixed bottom-0 left-0 right-0 z-[60]",
            "bg-white/95 backdrop-blur-sm border-t border-navy/10",
            "shadow-[0_-8px_32px_-4px_rgba(15,23,42,0.12)]",
            "px-2 pb-2 sm:px-4 sm:pb-3",
            "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto mx-auto max-w-7xl",
              "px-3 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]",
              "sm:px-5 sm:py-3 sm:pb-[max(0.85rem,env(safe-area-inset-bottom,0px))]",
            )}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
