/** 네트워크 랜딩 — 매체 상세와 동일한 라이트/다크 카드 토큰 (violet/cyan 포인트 유지) */
export const NETWORK_PANEL =
  "rounded-[24px] border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 sm:p-8";

export const NETWORK_CARD =
  "rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]";

export const NETWORK_CHIP =
  "rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 transition dark:border-white/12 dark:bg-white/6 dark:text-white/80";

export const NETWORK_CHIP_ACTIVE =
  "border-violet-500/50 bg-violet-500/10 text-violet-700 dark:text-violet-300";

export const NETWORK_CTA =
  "tkad-neon-cta-clean inline-flex items-center justify-center gap-2 rounded-[22px] px-6 py-3 text-sm font-black transition-transform hover:-translate-y-0.5";

export const NETWORK_CTA_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-[22px] border border-gray-200 bg-white px-6 py-3 text-sm font-black text-gray-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 dark:border-white/14 dark:bg-white/6 dark:text-white dark:hover:bg-white/10";

/** @deprecated use NETWORK_PANEL */
export const NETWORK_NEON_PANEL = NETWORK_PANEL;
/** @deprecated use NETWORK_CARD */
export const NETWORK_NEON_CARD = NETWORK_CARD;
/** @deprecated use NETWORK_CHIP */
export const NETWORK_NEON_CHIP = NETWORK_CHIP;
/** @deprecated use NETWORK_CHIP_ACTIVE */
export const NETWORK_NEON_CHIP_ACTIVE = NETWORK_CHIP_ACTIVE;
/** @deprecated use NETWORK_CTA */
export const NETWORK_NEON_CTA = NETWORK_CTA;
/** @deprecated use NETWORK_CTA_SECONDARY */
export const NETWORK_NEON_CTA_SECONDARY = NETWORK_CTA_SECONDARY;
