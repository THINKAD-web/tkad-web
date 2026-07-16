"use client";

import { useLocale } from "next-intl";
import { Compass, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HomeMediaSearch } from "@/components/home/home-media-search";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { HomeFreetextEntry } from "@/components/home/home-freetext-entry";
import { cn } from "@/lib/utils";

/**
 * 홈 above-fold: "매체 둘러보기" vs "AI 추천" 2갈래 분기.
 * 모바일 — 탐색(검색+퀵액세스) 먼저, AI 추천은 슬림 카드로 아래.
 */
export function HomeExploreSplit() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <section
      id="home-explore"
      className="scroll-mt-16 px-4 pb-3 md:px-6 md:pb-4 lg:px-8"
      aria-label={isKo ? "시작하기" : "Get started"}
    >
      <div className="mx-auto grid max-w-5xl gap-3 md:grid-cols-2 md:gap-4">
        {/* Path 1: Browse */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border border-cyan-400/25 bg-white p-4 shadow-sm ring-1 ring-black/5",
            "dark:border-cyan-400/20 dark:bg-white/[0.04] dark:ring-white/10 md:rounded-3xl md:p-5",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white md:text-lg">
                {isKo ? "매체 둘러보기" : "Browse media"}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-white/65">
                {isKo
                  ? "매체명·지역으로 검색하거나 바로가기로 탐색을 시작하세요."
                  : "Search by name or region, or use shortcuts below."}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <HomeMediaSearch prominent />
          </div>

          <HomeQuickAccess compact embedded />

          <Link
            href="/media"
            className="mt-3 text-center text-xs font-semibold text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300"
          >
            {isKo ? "전체 매체 목록 보기 →" : "View all media →"}
          </Link>
        </div>

        {/* Path 2: AI recommend */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.05] via-white to-cyan-500/[0.04] p-4 shadow-sm ring-1 ring-black/5",
            "dark:from-violet-500/10 dark:via-white/[0.03] dark:to-cyan-500/5 dark:ring-white/10 md:rounded-3xl md:p-5",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold tracking-tight text-gray-900 dark:text-white md:text-lg">
                {isKo ? "AI로 추천받기" : "AI recommendations"}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-white/65">
                {isKo
                  ? "지역·타깃·예산을 입력하면 순위·지도·견적까지 한 번에."
                  : "Enter region, audience, and budget for ranked picks and quotes."}
              </p>
            </div>
          </div>

          <HomeFreetextEntry variant="slim" embedded />
        </div>
      </div>
    </section>
  );
}
