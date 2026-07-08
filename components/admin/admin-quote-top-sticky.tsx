"use client";

import { FileSignature, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  summary?: string;
  contractLabel: string;
  blockReason: string | null;
  canCreate: boolean;
  busy: boolean;
  onContractClick: () => void;
  emailBanner?: string | null;
};

/** edit/new 공통 — quoteId 없어도 항상 노출되는 상단 계약 sticky */
export function AdminQuoteTopSticky({
  title,
  summary,
  contractLabel,
  blockReason,
  canCreate,
  busy,
  onContractClick,
  emailBanner,
}: Props) {
  return (
    <div
      className="sticky top-0 z-30 -mx-1 rounded-2xl border-2 border-violet-300/60 bg-white/95 px-4 py-3 shadow-md backdrop-blur-md dark:border-violet-400/35 dark:bg-[#0a0a12]/95"
      role="region"
      aria-label={title}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
            {title}
          </p>
          {summary ? (
            <p className="mt-1 text-sm font-medium text-foreground">{summary}</p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-md lg:items-end">
          {emailBanner ? (
            <p
              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold leading-snug text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100"
              role="status"
            >
              {emailBanner}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!canCreate || busy}
            onClick={onContractClick}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 text-sm font-bold transition-colors sm:w-auto sm:min-w-[220px]",
              canCreate && !busy
                ? "border-violet-500 bg-gradient-to-r from-violet-500 to-cyan-400 text-white shadow-sm hover:opacity-95"
                : "cursor-not-allowed border-violet-400/80 bg-white text-foreground dark:border-violet-400/50 dark:bg-white/10 dark:text-white",
              busy && "pointer-events-none",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileSignature className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {contractLabel}
          </button>
          {blockReason ? (
            <p className="text-sm font-semibold leading-snug text-amber-900 dark:text-amber-200">
              {blockReason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
