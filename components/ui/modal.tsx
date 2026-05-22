"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** Prevents closing via backdrop click / ESC (e.g. after submit) */
  locked?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

export default function Modal({
  open,
  onClose,
  children,
  className,
  locked,
  ariaLabel,
  ariaLabelledBy,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, locked]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !mounted) return null;

  const node = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div
        className={cn(
          "absolute inset-0 dark:bg-black bg-white dark:bg-white/5 bg-gray-500/50 backdrop-blur-md transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={() => !locked && onClose()}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "tkad-glass-surface relative w-full max-h-[min(92dvh,920px)] animate-fade-in-up overflow-y-auto overscroll-contain rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white/45 dark:text-white text-gray-900 shadow-[0_28px_120px_rgba(0,0,0,0.65)] backdrop-blur sm:max-h-[90vh]",
          className ?? "max-w-lg",
        )}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_90%_20%,rgba(168,85,247,0.14),transparent_58%),radial-gradient(circle_at_55%_110%,rgba(236,72,153,0.12),transparent_60%)]"
        />
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border dark:border-white/10 border-gray-200 dark:bg-black bg-white/20 dark:text-white text-gray-700 transition-colors hover:dark:bg-white/10 bg-gray-100 hover:dark:text-white text-gray-900 disabled:pointer-events-none disabled:opacity-50 sm:right-4 sm:top-4 sm:h-8 sm:w-8"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
