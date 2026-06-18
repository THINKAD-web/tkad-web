"use client";

import { Link } from "@/i18n/navigation";
import type { LucideIcon } from "lucide-react";
import { NavBetaBadge } from "@/components/navigation/nav-beta-badge";
import { cn } from "@/lib/utils";

export interface SubTab {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
  beta?: boolean;
}

interface SubTabsProps {
  tabs: SubTab[];
  /** Locale-free path used for active tab matching (e.g. `/planner`). */
  currentPath: string;
}

function isTabActive(tab: SubTab, pathname: string): boolean {
  if (tab.match) return tab.match(pathname);
  return (
    pathname === tab.href ||
    (tab.href !== "/" && pathname.startsWith(`${tab.href}/`))
  );
}

export function SubTabs({ tabs, currentPath }: SubTabsProps) {
  return (
    <div
      className={cn(
        "sticky top-14 z-20 border-b backdrop-blur-md",
        "border-gray-200 bg-white/95 dark:border-white/10 dark:bg-[#020202]/95",
      )}
    >
      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2">
        {tabs.map((tab) => {
          const isActive = isTabActive(tab, currentPath);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "tkad-neon-cta-clean text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/8 dark:text-white/70 hover:dark:bg-white/15",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tab.label}
              {tab.beta ? <NavBetaBadge className="ml-0.5" /> : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
