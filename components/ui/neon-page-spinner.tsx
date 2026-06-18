"use client";

import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
  /** `/dashboard`, `/my` 로딩 — 푸터 이음새와 동일 */
  portal?: boolean;
};

/** 플래너·대시보드 등 `tkad-planner-neon` 페이지용 풀스크린 로딩 */
export function NeonFullPageSpinner({
  label = "불러오는 중…",
  className,
  portal,
}: Props) {
  return (
    <HomeLandingDayNight portal={portal}>
      <div
        className={cn(
          "tkad-landing-neon tkad-planner-neon flex items-center justify-center px-4",
          portal
            ? "tkad-portal-shell min-h-[calc(100dvh-4rem)]"
            : "min-h-[calc(100vh-72px)]",
          className,
        )}
      >
        <div
          role="status"
          aria-live="polite"
          className="tkad-glass-surface tkad-neon-border tkad-neon-glow flex flex-col items-center gap-5 rounded-[28px] border dark:border-white/12 border-gray-200 px-10 py-12 text-center backdrop-blur-md sm:px-14 sm:py-14"
        >
          <span
            className="tkad-neon-spinner-ring h-12 w-12 animate-spin rounded-full border-[3px] sm:h-14 sm:w-14"
            aria-hidden
          />
          <p className="tkad-home-accent-text tkad-neon-text font-display text-sm font-semibold uppercase tracking-[0.22em] sm:text-base">
            {label}
          </p>
          <p className="max-w-xs font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-400/70 sm:text-xs">
            // THINKAD
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
