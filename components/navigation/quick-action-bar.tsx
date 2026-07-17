"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Bot, MessageCircle, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { cn } from "@/lib/utils";
import { useContactChannelSheet } from "@/components/contact/contact-channel-provider";
import { withSearchParamsSuspense } from "@/components/with-search-params-suspense";
import { PLAN_NAV_LABELS } from "@/lib/navigation/logged-in-nav-labels";

function KakaoTalkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.742 1.815 5.146 4.545 6.52-.198.72-.717 2.606-.82 3.01-.13.52.19.512.398.372.165-.11 2.615-1.755 3.676-2.47.387.053.784.08 1.201.08 5.523 0 10-3.477 10-7.8S17.523 3 12 3z" />
    </svg>
  );
}

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

function isHomePath(pathname: string): boolean {
  const path = pathname.replace(/^\/(ko|en)/, "") || "/";
  return path === "/" || path === "";
}

type DesktopQuickAction = {
  id: string;
  href: string;
  labelKo: string;
  labelEn: string;
  icon: LucideIcon;
  match: (pathname: string, tab: string | null) => boolean;
  /** Primary accent CTA (Quiet Professional solid) */
  variant?: "accent" | "outline";
  badge?: number;
};

const qpSidebarCta =
  "tkad-qp-cta text-white [&_svg]:text-white";

function actionRowClass(compact: boolean) {
  return cn(
    "relative flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
    compact ? "px-2 py-2.5" : "px-3 py-2.5",
  );
}

function mutedSidebarBtn(compact: boolean) {
  return cn(
    actionRowClass(compact),
    "border border-gray-200 font-medium text-gray-600 hover:bg-gray-50",
    "dark:border-white/12 dark:text-white/65 dark:hover:bg-white/5",
    "[&_svg]:text-gray-500 dark:[&_svg]:text-white/50",
  );
}

function QuickActionBarDesktopInner({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";
  const tChat = useTranslations("supportChat");
  const { openAi } = useContactChannelSheet();
  const tab = searchParams.get("tab");

  if (isHiddenPath(pathname)) return null;

  const onHome = isHomePath(pathname);
  const aiLabel = isKo ? "AI 챗봇 상담" : "AI chatbot";

  const actions: DesktopQuickAction[] = [
    {
      id: "planner",
      href: "/planner",
      labelKo: PLAN_NAV_LABELS.newPlan.ko,
      labelEn: PLAN_NAV_LABELS.newPlan.en,
      icon: Plus,
      variant: "accent",
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
      <button
        type="button"
        onClick={openAi}
        title={aiLabel}
        aria-label={aiLabel}
        className={cn(
          onHome
            ? mutedSidebarBtn(compact)
            : cn(actionRowClass(compact), qpSidebarCta),
        )}
      >
        <Bot className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        {!compact ? <span className="min-w-0 flex-1 truncate text-left">{aiLabel}</span> : null}
      </button>

      <a
        href={KAKAO_CHANNEL_PUBLIC_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={tChat("kakaoCta")}
        aria-label={tChat("kakaoCta")}
        className={cn(
          onHome
            ? mutedSidebarBtn(compact)
            : cn(
                actionRowClass(compact),
                "bg-[#FEE500] font-medium text-[#191600] hover:brightness-95",
              ),
        )}
      >
        <KakaoTalkIcon className="h-4 w-4 shrink-0" />
        {!compact ? (
          <span className="min-w-0 flex-1 truncate text-left">{tChat("kakaoCta")}</span>
        ) : null}
      </a>

      {actions.map((action) => {
        const active = action.match(pathname, tab);
        const label = isKo ? action.labelKo : action.labelEn;
        const Icon = action.icon;
        const isAccent = !onHome && (action.variant === "accent" || active);

        return (
          <Link
            key={action.id}
            href={action.href}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            className={cn(
              actionRowClass(compact),
              isAccent
                ? qpSidebarCta
                : action.variant === "outline"
                  ? cn(
                      "border font-medium",
                      active
                        ? "border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent-soft)] text-gray-900 dark:text-white [&_svg]:text-[color:var(--qp-accent)]"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5 [&_svg]:text-gray-500 dark:[&_svg]:text-white/55",
                    )
                  : cn(
                      active
                        ? qpSidebarCta
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
