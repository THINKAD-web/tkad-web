"use client";

import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils";

export interface SubTab {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  beta?: boolean;
}

/** scroll-pill: 발견하기·콘텐츠 등 가로 스크롤 pill. planning-cards: AI/상세 플래너 정사각형 카드 */
export type SubTabsLayout = "scroll-pill" | "planning-cards";

const PLANNING_TAB_CARD =
  "flex aspect-square w-[7.25rem] max-w-[42vw] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:w-[8rem] sm:text-sm";

interface SubTabsProps {
  tabs: SubTab[];
  /** Locale-free path used for active tab matching (e.g. `/planner`). */
  currentPath: string;
  layout?: SubTabsLayout;
}

function isTabActive(tab: SubTab, pathname: string): boolean {
  if (tab.match) return tab.match(pathname);
  return (
    pathname === tab.href ||
    (tab.href !== "/" && pathname.startsWith(`${tab.href}/`))
  );
}

export function SubTabs({
  tabs,
  currentPath,
  layout = "scroll-pill",
}: SubTabsProps) {
  const isPlanningCards = layout === "planning-cards";

  return (
    <div
      className={cn(
        isPlanningCards
          ? "relative z-10"
          : "sticky top-[var(--nav-safe-height)] z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-[#020202]/95",
      )}
    >
      <PageContainer className={isPlanningCards ? "px-0 sm:px-4" : undefined}>
        <div
          className={cn(
            isPlanningCards
              ? "mx-auto flex max-w-md flex-wrap items-stretch justify-center gap-2 py-2 sm:gap-3 sm:py-2.5"
              : "scrollbar-hide flex gap-2 overflow-x-auto py-2",
          )}
          role={isPlanningCards ? "tablist" : undefined}
        >
          {tabs.map((tab) => {
            const isActive = isTabActive(tab, currentPath);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role={isPlanningCards ? "tab" : undefined}
                aria-selected={isPlanningCards ? isActive : undefined}
                className={cn(
                  isPlanningCards
                    ? cn(
                        PLANNING_TAB_CARD,
                        isActive
                          ? "border-gray-200 tkad-qp-cta text-white shadow-sm dark:border-white/15"
                          : "border-transparent bg-gray-50/80 text-gray-500 hover:bg-gray-100 dark:bg-white/5 dark:text-white/55 dark:hover:bg-white/10",
                      )
                    : cn(
                        "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-ui",
                        isActive
                          ? "tkad-qp-cta text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/8 dark:text-white/70 hover:dark:bg-white/15",
                      ),
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    isPlanningCards ? "h-5 w-5 shrink-0" : "h-4 w-4",
                  )}
                  aria-hidden
                />
                <span>{tab.label}</span>
                {tab.beta ? (
                  <NavBetaBadge
                    className={isPlanningCards ? "mt-0.5" : "ml-0.5"}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </PageContainer>
    </div>
  );
}
