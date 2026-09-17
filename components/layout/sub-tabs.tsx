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

/**
 * planning-cards: 2~3개 · 정사각형 카드 · 중앙 wrap
 * scroll-cards: 3개+ · 컴팩트 카드 · 모바일 가로 스크롤 · sm+ 중앙 wrap
 * scroll-pill: (legacy) scroll-cards와 동일 렌더 — 하위 호환
 */
export type SubTabsLayout = "scroll-pill" | "planning-cards" | "scroll-cards";

const CARD_ACTIVE =
  "border-gray-200 tkad-qp-cta text-white shadow-sm dark:border-white/15";
const CARD_INACTIVE =
  "border-transparent bg-gray-50/80 text-gray-500 hover:bg-gray-100 dark:bg-white/5 dark:text-white/55 dark:hover:bg-white/10";

const PLANNING_TAB_CARD =
  "flex aspect-square w-[7.25rem] max-w-[42vw] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-center text-xs font-semibold leading-tight transition-colors sm:w-[8rem] sm:text-sm";

/** 긴 라벨(크리에이티브 스튜디오 등) — 정사각형 대신 고정 폭 컴팩트 카드 */
const SCROLL_TAB_CARD =
  "flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-semibold leading-snug transition-colors sm:text-xs min-w-[4.75rem] w-[21vw] max-w-[6.5rem] sm:min-w-[5.75rem] sm:w-[5.75rem] sm:max-w-none";

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

function resolveLayout(layout: SubTabsLayout): "planning-cards" | "scroll-cards" {
  if (layout === "planning-cards") return "planning-cards";
  return "scroll-cards";
}

export function SubTabs({
  tabs,
  currentPath,
  layout = "scroll-cards",
}: SubTabsProps) {
  const resolved = resolveLayout(layout);
  const isPlanningCards = resolved === "planning-cards";

  return (
    <div
      className={cn(
        isPlanningCards
          ? "relative z-10"
          : "sticky top-[var(--nav-safe-height)] z-20 border-b border-gray-200/70 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-[#020202]/90",
      )}
    >
      <PageContainer className={isPlanningCards ? "px-0 sm:px-4" : undefined}>
        <div
          className={cn(
            isPlanningCards
              ? "mx-auto flex max-w-md flex-wrap items-stretch justify-center gap-2 py-2 sm:gap-3 sm:py-2.5"
              : "scrollbar-hide mx-auto flex max-w-5xl snap-x snap-mandatory items-stretch justify-start gap-2 overflow-x-auto px-1 py-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-2 sm:py-2.5 sm:snap-none",
          )}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = isTabActive(tab, currentPath);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  isPlanningCards ? PLANNING_TAB_CARD : SCROLL_TAB_CARD,
                  "snap-center",
                  isActive ? CARD_ACTIVE : CARD_INACTIVE,
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    isPlanningCards ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0 sm:h-[1.125rem] sm:w-[1.125rem]",
                  )}
                  aria-hidden
                />
                <span className="line-clamp-2 w-full">{tab.label}</span>
                {tab.beta ? (
                  <NavBetaBadge
                    className={isPlanningCards ? "mt-0.5" : "mt-0.5 scale-90"}
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
