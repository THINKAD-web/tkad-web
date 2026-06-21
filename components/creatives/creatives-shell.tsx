"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageHero, type PageHeroProps } from "@/components/layout/page-hero";
import { PageContainer } from "@/components/layout/page-container";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * `/creatives/*` 모든 페이지가 공유하는 셸 (PageHero + SubTabs + 본문).
 */
export function CreativesShell({
  pageHero,
  subTabPath,
  eyebrow,
  title,
  description,
  rightSlot,
  children,
  showBackToLibrary = false,
  isKo = true,
}: {
  pageHero?: PageHeroProps;
  subTabPath?: string;
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  showBackToLibrary?: boolean;
  isKo?: boolean;
}) {
  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
        {pageHero ? (
          <>
            <PageHero {...pageHero} />
            <SubTabsBar group="studio" currentPath={subTabPath ?? "/creatives"} />
            {rightSlot ? (
              <div className="flex justify-end px-4 pb-4">{rightSlot}</div>
            ) : null}
          </>
        ) : (
          <section className="relative overflow-hidden border-b border-gray-200 bg-gray-50 text-gray-900 dark:border-white/10 dark:bg-[#05050a] dark:text-white">
            <PageContainer className="pb-6 pt-8 sm:pt-10">
              {showBackToLibrary ? (
                <Link
                  href="/creatives"
                  className="inline-flex items-center gap-1.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-gray-600 transition-colors hover:text-gray-900 dark:text-white/70 dark:hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />{" "}
                  {isKo ? "라이브러리로" : "Library"}
                </Link>
              ) : null}
              {eyebrow ? (
                <p
                  className={cn(
                    "font-display text-xs font-medium uppercase tracking-[0.28em] text-gray-600 dark:text-white/60",
                    showBackToLibrary ? "mt-3" : null,
                  )}
                >
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                  <h1 className="text-balance text-3xl font-black tracking-[-0.04em] text-gray-900 dark:text-white sm:text-4xl">
                    {title}
                  </h1>
                  {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
                </div>
              ) : null}
              {description ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-700 dark:text-white/70 sm:text-base">
                  {description}
                </p>
              ) : null}
            </PageContainer>
            <SubTabsBar group="studio" currentPath={subTabPath ?? "/creatives/upload"} />
          </section>
        )}

        <section className="bg-card py-10 sm:py-14">
          <PageContainer>{children}</PageContainer>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
