import { cn } from "@/lib/utils";

/** 모바일 햄버거 패널 — 찜·알림·장바구니 등 행 (다크: 부모 배경 상속, 라이트: hover만) */
export const headerMobileMenuRowClass =
  "flex min-h-[3.25rem] items-center gap-3 px-5 py-3 text-sm font-semibold tracking-normal text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:bg-transparent dark:text-white dark:hover:bg-white/6";

const headerChromeHover =
  "transition-colors duration-200 hover:border-[color:var(--qp-accent)]/40 hover:bg-[color:var(--qp-accent-soft)] hover:text-[color:var(--qp-fg)] dark:hover:border-[color:var(--qp-accent)]/45 dark:hover:bg-[color:var(--qp-accent)]/15 dark:hover:text-white";

const headerChromeBase =
  "inline-flex shrink-0 items-center justify-center border-2 border-border/25 bg-muted/80 text-foreground backdrop-blur-sm disabled:opacity-50 dark:border-white/15 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900";

export const headerChromeIconButtonClass = cn(
  headerChromeBase,
  headerChromeHover,
  "h-10 w-10 rounded-[var(--qp-radius-md)]",
);

/** 헤더 우측 — 가벼운 고스트 아이콘 (밀도 낮춤) */
export const headerChromeIconGhostClass = cn(
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--qp-radius-md)]",
  "text-gray-600 transition-colors hover:bg-gray-100/90 dark:text-white/70 dark:hover:bg-white/10",
);

export const headerChromeMenuItemClass =
  "flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/8";

/**
 * Guest/profile chrome dropdown panel.
 * Mobile: full-bleed under the h-14 header (same plane as hamburger panel).
 * md+: anchored w-64 dropdown.
 */
export const headerChromeDropdownPanelClass = cn(
  "z-[60] overflow-x-hidden overflow-y-auto border-gray-200 bg-white py-1 shadow-xl dark:border-white/12 dark:bg-[#0a0a12]",
  "fixed inset-x-0 top-14 max-h-[min(70dvh,calc(100dvh-3.5rem))] w-full max-w-none rounded-none border-x-0 border-y",
  "md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+0.35rem)] md:max-h-[min(80vh,32rem)] md:w-64 md:max-w-[calc(100vw-1.5rem)] md:rounded-xl md:border",
);

/** Mobile-only dimmer behind the full-bleed chrome dropdown. */
export const headerChromeDropdownBackdropClass =
  "fixed inset-0 z-[55] bg-black/35 md:hidden";

export const headerChromeTextButtonClass = cn(
  headerChromeBase,
  headerChromeHover,
  "h-10 rounded-[var(--qp-radius-md)] px-3.5 text-sm font-semibold",
);

/** 회원가입 — Quiet Professional 단색 CTA (그라데이션·glow 없음) */
export const headerChromeSignupButtonClass = cn(
  "tkad-qp-cta inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--qp-radius-md)] px-3.5 text-sm font-semibold",
  "border border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)]",
  "transition-colors hover:bg-[color:var(--qp-accent-hover)]",
);
