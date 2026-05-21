import { cn } from "@/lib/utils";

/** 헤더 우측 — 로그인·언어·테마 등 공통 호버(네온 violet→cyan) */
const headerChromeHover =
  "transition-all duration-300 hover:border-violet-400/55 hover:bg-gradient-to-br hover:from-violet-500 hover:to-cyan-400 hover:dark:text-white text-gray-900 hover:shadow-[0_0_28px_rgba(168,85,247,0.32),0_0_16px_rgba(34,211,238,0.22)] dark:hover:border-cyan-400/40 dark:hover:from-violet-500 dark:hover:to-cyan-400 dark:hover:dark:text-white text-gray-900 dark:hover:shadow-[0_0_32px_rgba(168,85,247,0.38),0_0_20px_rgba(34,211,238,0.28)]";

const headerChromeBase =
  "inline-flex shrink-0 items-center justify-center border-2 border-border/25 bg-muted/80 text-foreground backdrop-blur-sm disabled:opacity-50 dark:border-white/15 border-gray-200 dark:bg-white/8 bg-gray-100 dark:text-white text-gray-900";

export const headerChromeIconButtonClass = cn(
  headerChromeBase,
  headerChromeHover,
  "h-10 w-10 rounded-xl",
);

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
