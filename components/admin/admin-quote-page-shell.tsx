"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** /quote 마법사와 동일한 네온·카드 토큰 — 어드민 quotes 계열 공용 */
export function AdminQuotePageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tkad-planner-neon mx-auto max-w-6xl space-y-6 text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const adminQuoteSectionCard =
  "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5";

export const adminQuoteSectionHeader =
  "border-b border-gray-100 px-5 py-4 dark:border-white/10 sm:px-6";

export const adminQuoteSectionTitle =
  "text-base font-bold tracking-tight text-foreground sm:text-lg";

export const adminQuoteSectionHint = "mt-1 text-xs text-muted-foreground";
