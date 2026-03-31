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
            "border-t border-navy/10 bg-white shadow-lg",
          )}
        >
          <div
            className={cn(
              "mx-auto max-w-7xl",
              /* 모바일: 넉넉한 패딩·두께 */
              "px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]",
              /* PC: 얇고 정돈 */
              "md:px-6 md:py-2.5 md:pt-2.5 md:pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]",
              "lg:px-8",
            )}
          >
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
