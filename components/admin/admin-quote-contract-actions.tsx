"use client";

import { FileSignature, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  blockReason: string | null;
  canCreate: boolean;
  busy: boolean;
  onClick: () => void;
  size?: "default" | "sm";
  className?: string;
};

/** 견적 → 계약 브릿지 버튼 + disabled 이유 인라인 */
export function AdminQuoteContractActions({
  label,
  blockReason,
  canCreate,
  busy,
  onClick,
  size = "default",
  className,
}: Props) {
  const h = size === "sm" ? "h-9 text-xs" : "h-11 text-sm";

  return (
    <div className={className ?? "space-y-1.5"}>
      <button
        type="button"
        disabled={!canCreate || busy}
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 font-bold transition-colors disabled:opacity-100",
          h,
          canCreate && !busy
            ? "border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)] text-white shadow-sm hover:opacity-95"
            : "cursor-not-allowed border-[color:var(--qp-accent)]/50 bg-white text-foreground dark:border-[color:var(--qp-accent)]/50 dark:bg-white/10 dark:text-white",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FileSignature className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {label}
      </button>
      {blockReason ? (
        <p className="tkad-type-title leading-snug text-amber-900 dark:text-amber-200">
          {blockReason}
        </p>
      ) : null}
    </div>
  );
}
