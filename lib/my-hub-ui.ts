/** 마이허브(`/my`) 공통 네온 UI 토큰 — 대시보드·견적 페이지와 동일 계열 */
export const myHubGlassPanel =
  "tkad-glass-surface tkad-neon-border rounded-[32px] border border-white/12 bg-white/6 backdrop-blur-md";

export const myHubGlassCard =
  "tkad-glass-surface rounded-[24px] border border-border/60 bg-card/90 p-5 shadow-sm backdrop-blur-md dark:border-white/12 dark:bg-white/6 sm:p-6";

export const myHubPrimaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_8px_28px_rgba(34,211,238,0.22)] transition-all hover:opacity-95 disabled:opacity-50";

export const myHubOutlineBtn =
  "inline-flex items-center justify-center gap-2 rounded-[18px] border border-border bg-card/90 px-5 py-3 text-sm font-bold text-foreground backdrop-blur-sm transition-colors hover:bg-muted/60 dark:border-white/14 dark:bg-white/6 dark:text-white/90 dark:hover:bg-white/10";

export const myHubInput =
  "min-h-12 w-full rounded-[18px] border border-border bg-card/90 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none dark:border-white/18 dark:bg-black/20 dark:text-white dark:placeholder:text-white/40";

export const myHubSelect =
  "min-h-12 rounded-[18px] border border-border bg-card/90 px-3 text-sm text-foreground focus:border-primary focus:outline-none dark:border-white/18 dark:bg-black/20 dark:text-white";

export const myHubFilterPill = (active: boolean) =>
  active
    ? "border-primary/40 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
    : "border-border bg-card/80 text-muted-foreground hover:border-primary/25 hover:text-foreground dark:border-white/12 dark:bg-white/5 dark:text-white/60 dark:hover:text-white/90";
