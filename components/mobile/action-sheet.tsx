"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";

export type ActionSheetItem = {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  icon?: ReactNode;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
  cancelLabel: string;
  title?: string;
  className?: string;
};

export function ActionSheet({
  open,
  onClose,
  items,
  cancelLabel,
  title,
  className,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={cn("fixed inset-0 z-[90] md:hidden", className)}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label={cancelLabel}
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <div className="absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <motion.div
              role="menu"
              aria-label={title}
              className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              {title ? (
                <p className="border-b border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-white/50">
                  {title}
                </p>
              ) : null}
              <ul>
                {items.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={cn(
                        "flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[15px] font-medium transition-colors active:bg-gray-100 dark:active:bg-white/5",
                        item.destructive
                          ? "text-red-500"
                          : "text-gray-900 dark:text-white",
                        index > 0 && "border-t border-gray-200 dark:border-white/10",
                      )}
                      onClick={() => {
                        hapticLight();
                        item.onSelect();
                        onClose();
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.button
              type="button"
              role="menuitem"
              className="mt-2 w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] font-semibold text-gray-900 transition-colors active:bg-gray-100 dark:bg-gray-900 dark:text-white dark:active:bg-white/5"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320, delay: 0.03 }}
              onClick={() => {
                hapticLight();
                onClose();
              }}
            >
              {cancelLabel}
            </motion.button>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
