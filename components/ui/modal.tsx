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
    setMounted(true);
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
          "absolute inset-0 bg-navy-dark/50 backdrop-blur-sm transition-opacity duration-300",
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
          "relative w-full max-h-[min(92dvh,920px)] animate-fade-in-up overflow-y-auto overscroll-contain rounded-2xl border border-navy/10 bg-white shadow-2xl sm:max-h-[90vh]",
          className ?? "max-w-lg",
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy disabled:pointer-events-none disabled:opacity-50 sm:top-4 sm:right-4 sm:h-8 sm:w-8"
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
