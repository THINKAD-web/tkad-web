"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";

export default function PlannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const isKo = locale === "ko";

  useEffect(() => {
    console.error("[planner] page error", error);
  }, [error]);

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-24">
        <div
          className={cn(
            "relative w-full max-w-md overflow-hidden rounded-[28px] border p-8 text-center",
            "border-gray-200/80 bg-white/85 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-md",
            "dark:border-white/12 dark:bg-[#05050a]/88 dark:shadow-[0_28px_120px_rgba(0,0,0,0.55)]",
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.09] tkad-neon-grid"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-16 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_55%)]"
          />
          <div className="relative">
            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-cyan-600/80 dark:text-cyan-300/75">
              [ PLANNER ]
            </p>
            <h1 className="mt-4 text-xl font-black text-gray-900 dark:text-white">
              {isKo
                ? "플래너를 불러오지 못했습니다"
                : "Could not load the planner"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-white/60">
              {isKo
                ? "잠시 후 다시 시도하거나 매체 목록에서 다시 시작해 주세요."
                : "Please try again or browse media to start over."}
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="tkad-neon-cta-clean inline-flex h-12 min-h-12 items-center justify-center rounded-[18px] px-6 text-sm font-black text-white shadow-[0_12px_40px_rgba(124,58,237,0.28)] transition-transform hover:-translate-y-0.5"
              >
                {isKo ? "다시 시도" : "Try again"}
              </button>
              <Link
                href="/media"
                className="inline-flex h-12 min-h-12 items-center justify-center rounded-[18px] border border-violet-300/45 bg-violet-500/10 px-6 text-sm font-bold text-gray-900 transition hover:bg-violet-500/18 dark:border-violet-400/35 dark:text-white dark:hover:bg-violet-500/20"
              >
                {isKo ? "매체 탐색하기" : "Browse media"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
