"use client";

import { useEffect, useRef, type ReactNode } from "react";
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className={cn(
          "absolute inset-0 bg-navy-dark/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
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
          "relative w-full animate-fade-in-up rounded-2xl border border-navy/10 bg-white shadow-2xl",
          "max-h-[90vh] overflow-y-auto",
          className ?? "max-w-lg"
        )}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={locked}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-navy disabled:pointer-events-none disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
