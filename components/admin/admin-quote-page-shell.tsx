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

/** quotes/contracts 계열 공용 — 라이트·다크 대비 통일 */
export const adminQuoteSelectClass =
  "rounded-md border border-input bg-white px-2 text-sm text-foreground dark:bg-white/5 dark:text-hero-fg";

export const adminQuoteTableTheadClass =
  "border-b bg-muted text-left text-xs text-muted-foreground dark:bg-card/5";

export const adminQuoteTableRowClass =
  "border-b border-border/10 bg-white dark:border-hero-fg/10 dark:bg-transparent";

export const adminQuoteTableExpandedRowClass =
  "bg-muted/50 dark:bg-card/10";

export const adminQuoteLinkVioletClass =
  "font-semibold text-violet-700 hover:underline dark:text-violet-300";

export const adminQuoteEmphasisTextClass =
  "font-medium text-foreground dark:text-hero-fg";

export const adminQuoteSurfaceMutedClass =
  "rounded-lg border bg-muted/30 dark:bg-card/5";
