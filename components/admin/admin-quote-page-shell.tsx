"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 어드민 quotes 계열 공용 레이아웃 — qp 톤 */
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
        "mx-auto max-w-6xl space-y-6 text-foreground",
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

export const adminQuoteLinkAccentClass =
  "font-semibold text-[color:var(--qp-accent)] hover:underline dark:text-[color:var(--qp-accent)]";

export const adminQuoteEmphasisTextClass =
  "font-medium text-foreground dark:text-hero-fg";

export const adminQuoteSurfaceMutedClass =
  "rounded-lg border bg-muted/30 dark:bg-card/5";

/** 모바일 카드 목록 — 매체관리 md:hidden 패턴과 동일 */
export const adminMobileListClass = "md:hidden divide-y divide-border";

export const adminMobileCardClass = "px-3 py-3";

export const adminMobileTouchBtnClass = "h-11 min-h-11 text-sm";

export const adminDesktopTableWrapClass = "hidden overflow-x-auto md:block";
