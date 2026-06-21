"use client";

import { useCallback } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Heart,
  LayoutList,
  LogOut,
  Megaphone,
  MessageCircle,
  Pencil,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FAVORITES_NAV_LABEL, PLAN_NAV_LABELS } from "@/lib/navigation/logged-in-nav-labels";
import { ProTrialBanner, type ProTrialStatus } from "@/components/my/pro-trial-banner";
import { MobilePullToRefresh } from "@/components/mobile/mobile-pull-to-refresh";

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
  plan?: string;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number;
  trialProgressPct?: number;
  pointBalance?: number;
  createdAt?: string | null;
};

type Stats = {
  favorites: number;
  inquiries: number;
  plans: number;
};

type Props = {
  me: Me;
  stats: Stats;
  monthlyPoints?: number;
  isKo: boolean;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
};

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
}

function roleLabel(role: string, isKo: boolean): string {
  if (role === "owner" || role === "admin") return isKo ? "매체사" : "Media owner";
  if (role === "advertiser") return isKo ? "광고주" : "Advertiser";
  return isKo ? "회원" : "Member";
}

type MenuItem = {
  href?: string;
  label: string;
  icon: typeof Heart;
  onClick?: () => void;
  destructive?: boolean;
};

export function MobileMyHubView({
  me,
  stats,
  monthlyPoints = 0,
  isKo,
  onRefresh,
  onLogout,
}: Props) {
  const router = useRouter();
  const joinDays = daysSince(me.createdAt ?? me.trialStartedAt);

  const menuItems: MenuItem[] = [
    {
      href: "/my?tab=favorites",
      label: isKo ? FAVORITES_NAV_LABEL.ko : FAVORITES_NAV_LABEL.en,
      icon: Heart,
    },
    {
      href: "/my/booking-requests",
      label: isKo ? "견적 내역" : "Quote history",
      icon: FileText,
    },
    {
      href: "/my?tab=campaigns",
      label: isKo ? "내 캠페인" : "My campaigns",
      icon: Megaphone,
    },
    {
      href: "/my/plan",
      label: isKo ? PLAN_NAV_LABELS.cart.ko : PLAN_NAV_LABELS.cart.en,
      icon: LayoutList,
    },
    {
      href: "/contact",
      label: isKo ? "1:1 문의" : "Contact us",
      icon: MessageCircle,
    },
    {
      href: "/guide/how-to-use",
      label: isKo ? "사용 가이드" : "User guide",
      icon: BookOpen,
    },
    {
      href: "/my/notifications",
      label: isKo ? "알림 설정" : "Notifications",
      icon: Bell,
    },
    {
      href: "/my/settings",
      label: isKo ? "계정 설정" : "Account settings",
      icon: Settings,
    },
    {
      label: isKo ? "로그아웃" : "Log out",
      icon: LogOut,
      onClick: onLogout,
      destructive: true,
    },
  ];

  const refresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  return (
    <MobilePullToRefresh onRefresh={refresh}>
      <div className="pb-4 md:hidden">
        {/* Profile card */}
        <section className="relative overflow-hidden px-4 pb-4 pt-2">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 via-transparent to-cyan-400/10" />
          <div className="relative rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-gray-950">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xl font-bold text-white">
                {me.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-gray-900 dark:text-white">
                  {me.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-white/50">
                  {roleLabel(me.role, isKo)}
                  {joinDays > 0
                    ? ` · ${isKo ? `${joinDays}일째` : `Day ${joinDays}`}`
                    : ""}
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-white/40">
                  {me.email}
                </p>
              </div>
              <Link
                href="/my/settings"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-transform duration-150 active:scale-95 dark:border-white/10 dark:text-white/80 dark:active:bg-white/5 active:bg-gray-100"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isKo ? "프로필 편집" : "Edit profile"}
              </Link>
            </div>
          </div>
        </section>

        <div className="space-y-3 px-4">
          {me.plan === "PRO_TRIAL" && (me.trialDaysLeft ?? 0) > 0 ? (
            <ProTrialBanner
              trial={
                {
                  plan: me.plan,
                  trialStartedAt: me.trialStartedAt ?? null,
                  trialEndsAt: me.trialEndsAt ?? null,
                  daysLeft: me.trialDaysLeft ?? 0,
                  progressPct: me.trialProgressPct ?? 0,
                } satisfies ProTrialStatus
              }
              isKo={isKo}
            />
          ) : null}

          {/* Points card */}
          <Link
            href="/points"
            className="block rounded-2xl border border-gray-200 bg-white p-4 transition-transform duration-150 active:scale-[0.98] dark:border-white/10 dark:bg-gray-950"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isKo ? "포인트" : "Points"}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {(me.pointBalance ?? 0).toLocaleString(isKo ? "ko-KR" : "en-US")}
              <span className="ml-1 text-sm font-normal text-gray-500">P</span>
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/50">
              {isKo
                ? `이번 달 +${monthlyPoints.toLocaleString("ko-KR")}P 적립 · `
                : `+${monthlyPoints.toLocaleString("en-US")}P this month · `}
              <span className="font-semibold text-violet-600 dark:text-violet-300">
                {isKo ? "포인트 샵 →" : "Points shop →"}
              </span>
            </p>
          </Link>

          {/* Activity stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: isKo ? FAVORITES_NAV_LABEL.ko : FAVORITES_NAV_LABEL.en, value: stats.favorites },
              { label: isKo ? "문의" : "Inquiries", value: stats.inquiries },
              { label: isKo ? "플랜" : "Plans", value: stats.plans },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-center dark:border-white/10 dark:bg-gray-950"
              >
                <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {s.value}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Menu list */}
          <nav className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950">
            <ul>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const inner = (
                  <>
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        item.destructive
                          ? "text-rose-500"
                          : "text-gray-500 dark:text-white/50",
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm font-medium",
                        item.destructive
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-gray-900 dark:text-white",
                      )}
                    >
                      {item.label}
                    </span>
                    {!item.destructive ? (
                      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-white/30" />
                    ) : null}
                  </>
                );

                return (
                  <li key={item.label} className="border-b border-gray-200 last:border-b-0 dark:border-white/10">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-4 transition-colors active:bg-gray-100 dark:active:bg-white/5"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={item.onClick}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-gray-100 dark:active:bg-white/5"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </MobilePullToRefresh>
  );
}
