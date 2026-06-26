"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { MessageCircle, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import { PLAN_NAV_LABELS } from "@/lib/navigation/logged-in-nav-labels";

function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/signup") ||
    pathname.includes("/reset-password") ||
    pathname.includes("/forgot-password") ||
    pathname.startsWith("/planner")
  );
}

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

function QuickActionBarDesktopInner({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tab = searchParams.get("tab");

  if (isHiddenPath(pathname)) return null;

  const actions: DesktopQuickAction[] = [
    {
      id: "planner",
      href: "/planner",
      labelKo: PLAN_NAV_LABELS.newPlan.ko,
      labelEn: PLAN_NAV_LABELS.newPlan.en,
      icon: Plus,
      variant: "neon",
      match: (p) => p.startsWith("/planner"),
    },
    {
      id: "quote",
      href: "/quote",
      labelKo: "견적서 작성",
      labelEn: "Create quote",
      icon: MessageCircle,
      variant: "outline",
      match: (p) => p.startsWith("/quote"),
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
                {action.badge > 99 ? "99+" : action.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

export const QuickActionBarDesktop = withSearchParamsSuspense(QuickActionBarDesktopInner);
