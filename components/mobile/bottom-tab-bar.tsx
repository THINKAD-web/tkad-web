"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  Compass,
  Home,
  LayoutGrid,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";
import { useMobileTabBadges } from "@/hooks/use-mobile-tab-badges";

type TabDef = {
  id: "home" | "explore" | "planner" | "contact" | "my";
  href: string;
  labelKey: string;
  icon: typeof Home;
  match: (path: string) => boolean;
  emphasized?: boolean;
  badgeKey?: "contact" | "my";
};

const TABS: TabDef[] = [
  {
    id: "home",
    href: "/",
    labelKey: "home",
    icon: Home,
    match: (p) => p === "/" || p === "",
  },
  {
    id: "explore",
    href: "/media",
    labelKey: "explore",
    icon: Compass,
    match: (p) => p.startsWith("/media") && !p.startsWith("/media-owner"),
  },
  {
    id: "planner",
    href: "/planner",
    labelKey: "planner",
    icon: LayoutGrid,
    match: (p) => p.startsWith("/planner"),
    emphasized: true,
  },
  {
    id: "contact",
    href: "/contact",
    labelKey: "contact",
    icon: MessageCircle,
    match: (p) => p.startsWith("/contact"),
    badgeKey: "contact",
  },
  {
    id: "my",
    href: "/my",
    labelKey: "my",
    icon: User,
    match: (p) => p.startsWith("/my"),
    badgeKey: "my",
  },
];

const LABELS: Record<string, { ko: string; en: string }> = {
  home: { ko: "홈", en: "Home" },
  explore: { ko: "탐색", en: "Explore" },
  planner: { ko: "플래너", en: "Planner" },
  contact: { ko: "문의", en: "Contact" },
  my: { ko: "내정보", en: "My" },
};

function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/signup") ||
    pathname.includes("/reset-password") ||
    pathname.includes("/forgot-password")
  );
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-2 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-gray-950">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const badges = useMobileTabBadges();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isHiddenPath(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 block h-16 border-t border-gray-200 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={isKo ? "하단 탭 메뉴" : "Bottom tab navigation"}
    >
      <ul className="mx-auto flex h-full max-w-lg items-end justify-around px-1">
        {TABS.map((tab) => {
          const active = tab.match(pathname ?? "");
          const Icon = tab.icon;
          const label = LABELS[tab.labelKey]?.[isKo ? "ko" : "en"] ?? tab.labelKey;
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] : 0;

          if (tab.emphasized) {
            return (
              <li key={tab.href} className="flex flex-1 justify-center">
                <Link
                  href={tab.href}
                  className={cn(
                    "relative -translate-y-2 flex flex-col items-center transition-transform duration-150 active:scale-95",
                  )}
                  aria-current={active ? "page" : undefined}
                  onClick={() => hapticLight()}
                >
                  <span
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-violet-500/30",
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={2.25} />
                  </span>
                  <span className="mt-1 text-[10px] font-semibold text-gray-900 dark:text-white">
                    {label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex flex-1 justify-center">
              <Link
                href={tab.href}
                className="flex flex-col items-center pb-2 pt-1 transition-transform duration-150 active:scale-95"
                aria-current={active ? "page" : undefined}
                onClick={() => hapticLight()}
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      active
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-white/50",
                    )}
                    strokeWidth={active ? 2.25 : 2}
                  />
                  <TabBadge count={badgeCount} />
                  {active ? (
                    <span
                      className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-500"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[10px]",
                    active
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-white/50",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
