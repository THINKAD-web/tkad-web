import { cn } from "@/lib/utils";

/** 모바일 햄버거 패널 — 찜·알림·장바구니 등 행 (다크: 부모 배경 상속, 라이트: hover만) */
export const headerMobileMenuRowClass =
  "flex min-h-[3.25rem] items-center gap-3 px-5 py-3 text-sm font-semibold tracking-normal text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:bg-transparent dark:text-white dark:hover:bg-white/6";

const headerChromeHover =
  "transition-all duration-300 hover:border-violet-400/55 hover:bg-gradient-to-br hover:from-violet-500 hover:to-cyan-400 hover:dark:text-white text-gray-900 hover:shadow-[0_0_28px_rgba(168,85,247,0.32),0_0_16px_rgba(34,211,238,0.22)] dark:hover:border-cyan-400/40 dark:hover:from-violet-500 dark:hover:to-cyan-400 dark:hover:dark:text-white text-gray-900 dark:hover:shadow-[0_0_32px_rgba(168,85,247,0.38),0_0_20px_rgba(34,211,238,0.28)]";

const headerChromeBase =
  "inline-flex shrink-0 items-center justify-center border-2 border-border/25 bg-muted/80 text-foreground backdrop-blur-sm disabled:opacity-50 dark:border-white/15 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900";

export const headerChromeIconButtonClass = cn(
  headerChromeBase,
  headerChromeHover,
  "h-10 w-10 rounded-xl",
);

/** 헤더 우측 — 가벼운 고스트 아이콘 (밀도 낮춤) */
export const headerChromeIconGhostClass = cn(
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
  "text-gray-600 transition-colors hover:bg-gray-100/90 dark:text-white/70 dark:hover:bg-white/10",
);

export const headerChromeMenuItemClass =
  "flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 dark:text-white/90 dark:hover:bg-white/8";

export const headerChromeTextButtonClass = cn(
  headerChromeBase,
  headerChromeHover,
  "h-10 rounded-xl px-3.5 text-sm font-semibold",
);

/** 회원가입 — 기본은 네온 그라데이션, 호버는 다른 헤더 버튼과 동일 */
export const headerChromeSignupButtonClass = cn(
  headerChromeTextButtonClass,
  "border-violet-400/35 bg-gradient-to-r from-violet-500 to-cyan-400 dark:text-white text-gray-900 shadow-[0_6px_20px_rgba(124,58,237,0.28)]",
  "hover:!border-violet-300/60 hover:brightness-110 hover:shadow-[0_0_32px_rgba(168,85,247,0.38),0_0_20px_rgba(34,211,238,0.28)] dark:shadow-[0_0_18px_rgba(34,211,238,0.2)]",
);
