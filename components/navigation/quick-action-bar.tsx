"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { MessageCircle, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

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

function isMediaDetailPath(pathname: string): boolean {
  return (
    /^\/media\/[^/]+$/.test(pathname) &&
    !pathname.startsWith("/media/map") &&
    !pathname.startsWith("/media/category") &&
    !pathname.startsWith("/media/type") &&
    !pathname.startsWith("/media/region") &&
    !pathname.startsWith("/media/area") &&
    !pathname.startsWith("/media/network") &&
    !pathname.startsWith("/media/packages") &&
    !pathname.startsWith("/media/favorites") &&
    !pathname.startsWith("/media/compare") &&
    !pathname.startsWith("/media/submit") &&
    !pathname.startsWith("/media/keyword-filter")
  );
}

const MOBILE_ACTIONS = [
  {
    id: "media",
    href: "/media",
    labelKo: "매체검색",
    labelEn: "Media",
    match: (p: string) =>
      (p.startsWith("/media") && !p.startsWith("/media-owner") && !isMediaDetailPath(p)) ||
      p.startsWith("/search"),
  },
  {
    id: "planner",
    href: "/planner",
    labelKo: "플래너",
    labelEn: "Planner",
    match: (p: string) => p.startsWith("/planner"),
  },
  {
    id: "quote",
    href: "/quote",
    labelKo: "견적문의",
    labelEn: "Quote",
    match: (p: string) => p.startsWith("/quote") || p.startsWith("/contact"),
  },
] as const;

const DETAIL_ACTIONS = [
  {
    id: "compare",
    href: "/compare",
    labelKo: "매체비교",
    labelEn: "Compare",
    match: (p: string) => p.startsWith("/compare"),
  },
  {
    id: "favorites",
    href: "/media/favorites",
    labelKo: "관심매체",
    labelEn: "Saved",
    match: (p: string) => p.startsWith("/media/favorites"),
  },
  {
    id: "recommend",
    href: "/recommend",
    labelKo: "AI매체추천",
    labelEn: "AI pick",
    match: (p: string) => p.startsWith("/recommend"),
  },
] as const;

export function QuickActionBarMobile() {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const isKo = locale === "ko";

  if (isHiddenPath(pathname)) return null;

  const onDetail = isMediaDetailPath(pathname);
  const actions = onDetail ? DETAIL_ACTIONS : MOBILE_ACTIONS;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:hidden"
      data-screenshot="quick-actions-mobile"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
        {actions.map((action) => {
          const active = action.match(pathname);
          const label = isKo ? action.labelKo : action.labelEn;
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "rounded-xl py-2.5 text-center text-xs font-semibold transition-colors",
                active
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                  : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/80",
              )}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function QuickActionBarDesktop() {
  const pathname = usePathname() ?? "/";
  const locale = useLocale();
  const isKo = locale === "ko";

  if (isHiddenPath(pathname)) return null;

  return (
    <div
      className="hidden shrink-0 flex-col gap-2 border-t border-gray-200 p-2 dark:border-white/10 md:flex"
      data-screenshot="quick-actions-desktop"
    >
      <Link
        href="/planner"
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
          pathname.startsWith("/planner")
            ? "bg-violet-500 text-white"
            : "bg-violet-600 text-white hover:bg-violet-500",
        )}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {isKo ? "새 플랜" : "New plan"}
      </Link>
      <Link
        href="/quote"
        className={cn(
          "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
          pathname.startsWith("/quote")
            ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200"
            : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5",
        )}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {isKo ? "견적 문의" : "Get quote"}
      </Link>
    </div>
  );
}

/** Icons exported for potential reuse */
export { Search, MessageCircle };
