"use client";

import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  className?: string;
};

/** 플래너·대시보드 등 `tkad-planner-neon` 페이지용 풀스크린 로딩 */
export function NeonFullPageSpinner({
  label = "불러오는 중…",
  className,
}: Props) {
  return (
    <HomeLandingDayNight>
      <div
        className={cn(
          "tkad-landing-neon tkad-planner-neon flex min-h-[calc(100vh-72px)] items-center justify-center px-4",
          className,
        )}
      >
        <div
          role="status"
          aria-live="polite"
          className="tkad-glass-surface tkad-neon-border flex flex-col items-center gap-5 rounded-[28px] border border-white/12 px-10 py-12 text-center backdrop-blur-md sm:px-14 sm:py-14"
        >
          <span
            className="h-12 w-12 animate-spin rounded-full border-[3px] border-white/15 border-t-[#22d3ee] sm:h-14 sm:w-14"
            aria-hidden
          />
          <p className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-foreground sm:text-base">
            {label}
          </p>
          <p className="max-w-xs text-xs text-muted-foreground sm:text-sm">
            // THINKAD
          </p>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
