"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Heart,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";

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
    href: "/my?tab=favorites",
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

type DesktopQuickAction = {
  id: string;
  href: string;
  labelKo: string;
  labelEn: string;
  icon: LucideIcon;
  match: (pathname: string, tab: string | null) => boolean;
  variant?: "neon" | "outline";
  badge?: number;
};

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
                  ? "tkad-neon-cta-clean text-white"
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

export function QuickActionBarDesktop({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const { ids: cartIds } = useCart();
  const tab = searchParams.get("tab");

  if (isHiddenPath(pathname)) return null;

  const actions: DesktopQuickAction[] = [
    {
      id: "campaigns",
      href: "/my?tab=campaigns",
      labelKo: "내 캠페인",
      labelEn: "Campaigns",
      icon: Megaphone,
      match: (p, t) =>
        p.startsWith("/dashboard") ||
        (p.startsWith("/my") && (t === "campaigns" || t == null)),
    },
    {
      id: "favorites",
      href: "/my?tab=favorites",
      labelKo: "관심매체",
      labelEn: "Saved",
      icon: Heart,
      match: (p, t) =>
        p.startsWith("/media/favorites") || (p.startsWith("/my") && t === "favorites"),
    },
    {
      id: "cart",
      href: "/cart",
      labelKo: "장바구니",
      labelEn: "Cart",
      icon: ShoppingCart,
      match: (p) => p.startsWith("/cart"),
      badge: cartIds.length,
    },
    {
      id: "planner",
      href: "/planner",
      labelKo: "새 플랜",
      labelEn: "New plan",
      icon: Plus,
      variant: "neon",
      match: (p) => p.startsWith("/planner"),
    },
    {
      id: "quote",
      href: "/quote",
      labelKo: "견적 문의",
      labelEn: "Get quote",
      icon: MessageCircle,
      variant: "outline",
      match: (p) => p.startsWith("/quote") || p.startsWith("/contact"),
    },
  ];

  return (
    <div
      className="hidden shrink-0 flex-col gap-1.5 border-t border-gray-200 p-2 dark:border-white/10 md:flex"
      data-screenshot="quick-actions-desktop"
    >
      {actions.map((action) => {
        const active = action.match(pathname, tab);
        const label = isKo ? action.labelKo : action.labelEn;
        const Icon = action.icon;
        const isNeon = action.variant === "neon" || active;

        return (
          <Link
            key={action.id}
            href={action.href}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            className={cn(
              "relative flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              compact ? "px-2 py-2.5" : "px-3 py-2.5",
              isNeon
                ? "tkad-neon-cta-clean text-white [&_svg]:text-white"
                : action.variant === "outline"
                  ? cn(
                      "border font-medium",
                      active
                        ? "border-cyan-400/40 bg-cyan-400/10 text-gray-900 dark:text-white [&_svg]:text-cyan-500 dark:[&_svg]:text-cyan-300"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5 [&_svg]:text-gray-500 dark:[&_svg]:text-white/55",
                    )
                  : cn(
                      active
                        ? "tkad-neon-cta-clean text-white [&_svg]:text-white"
                        : "text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5 [&_svg]:text-gray-500 dark:[&_svg]:text-white/55",
                    ),
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {!compact ? <span className="min-w-0 flex-1 truncate text-left">{label}</span> : null}
            {!compact && action.badge != null && action.badge > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                {action.badge > 99 ? "99+" : action.badge}
              </span>
            ) : null}
            {compact && action.badge != null && action.badge > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {action.badge > 9 ? "9+" : action.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/** Icons exported for potential reuse */
export { Search, MessageCircle };
