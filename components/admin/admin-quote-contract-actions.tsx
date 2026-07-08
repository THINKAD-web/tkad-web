"use client";

import { FileSignature, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  blockReason: string | null;
  canCreate: boolean;
  busy: boolean;
  onClick: () => void;
  size?: "default" | "sm";
  className?: string;
};

/** 견적 → 계약 브릿지 버튼 + disabled 이유 인라인 (Phase 1 discoverability). */
export function AdminQuoteContractActions({
  label,
  blockReason,
  canCreate,
  busy,
  onClick,
  size = "default",
  className,
}: Props) {
  return (
    <div className={className ?? "space-y-1.5"}>
      <Button
        type="button"
        variant="secondary"
        size={size}
        className={
          size === "sm"
            ? "h-8 bg-navy text-xs text-white hover:bg-navy/90 dark:text-white"
            : "bg-navy text-white hover:bg-navy/90 dark:text-white"
        }
        disabled={!canCreate || busy}
        onClick={onClick}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSignature className="mr-2 h-4 w-4" />
        )}
        {label}
      </Button>
      {blockReason ? (
        <p className="text-xs leading-snug text-amber-800 dark:text-amber-200">
          {blockReason}
        </p>
      ) : null}
    </div>
  );
}
