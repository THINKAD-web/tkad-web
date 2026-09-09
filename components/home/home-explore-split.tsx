"use client";

import { useLocale } from "next-intl";
import { Compass, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HomeMediaSearch } from "@/components/home/home-media-search";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { HomeFreetextEntry } from "@/components/home/home-freetext-entry";
import { cn } from "@/lib/utils";

/**
 * 홈 above-fold: 카탈로그 검색 vs 둘러보기(/recommend) 2갈래.
 * 모바일 — 탐색(검색+퀵액세스) 먼저, 둘러보기는 슬림 카드로 아래.
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
            "flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5",
            "dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 md:p-5",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
                {isKo ? "매체 검색" : "Search media"}
              </h2>
              <p className="mt-1.5 text-base text-gray-600 dark:text-white/65">
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
            className="mt-3 text-center text-sm font-semibold text-hermes underline-offset-2 hover:underline"
          >
            {isKo ? "전체 매체 목록 보기 →" : "View all media →"}
          </Link>
        </div>

        {/* Path 2: AI recommend */}
        <div
          className={cn(
            "flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5",
            "dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 md:p-5",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-hermes/10 text-hermes">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
                {isKo ? "둘러보기" : "Browse picks"}
              </h2>
              <p className="mt-1.5 text-base text-gray-600 dark:text-white/65">
                {isKo
                  ? "조건 없이 빠르게 후보를 탐색합니다. 제안서까지 만들려면 「제안서 만들기」로 이어가세요."
                  : "Explore candidates quickly — no brief required. Use Create a proposal when you want a finished mix."}
              </p>
            </div>
          </div>

          <HomeFreetextEntry variant="slim" embedded />
        </div>
      </div>
    </section>
  );
}
