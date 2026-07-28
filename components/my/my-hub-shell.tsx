"use client";

import { type ReactNode, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  KeyRound,
  LogOut,
  Settings,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { PageContainer } from "@/components/layout/page-container";
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner";
import {
  useAuthSession,
  type AuthSessionUser,
} from "@/components/auth/auth-session-provider";
import { MyHubGroupNav } from "@/components/my/my-hub-group-nav";
import { MyHubUpgradeBanner } from "@/components/my/my-hub-upgrade-banner";
import { MyPlanStatusBadge } from "@/components/my/my-plan-status-badge";
import { ProTrialBanner } from "@/components/my/pro-trial-banner";
import { NeonFullPageSpinner } from "@/components/ui/neon-page-spinner";
import { myHubOutlineBtn } from "@/lib/my-hub-ui";
import {
  isMyHubPath,
  legacyMyHubTabRedirect,
} from "@/lib/my-hub-nav-config";

type Me = AuthSessionUser & {
  id: string;
  email: string;
  name: string;
  role: string;
  needsEmailVerification?: boolean;
  trialDaysLeft?: number;
  trialProgressPct?: number;
};

type Props = {
  children: ReactNode;
};

function stripLocale(path: string): string {
  return path.replace(/^\/(ko|en)/, "") || "/";
}

function asMe(user: AuthSessionUser | null): Me | null {
  if (!user?.id || !user.email || !user.name || !user.role) return null;
  return user as Me;
}

export function MyHubShell({ children }: Props) {
  const pathname = usePathname() ?? "/my";
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("myHub");
  const { user, loading, refresh } = useAuthSession();

  const me = asMe(user);
  const barePath = stripLocale(pathname);
  const isHubHome = barePath === "/my";
  const tab = searchParams.get("tab");

  useEffect(() => {
    const legacy = legacyMyHubTabRedirect(tab);
    if (legacy) {
      router.replace(legacy);
    }
  }, [tab, router]);

  useEffect(() => {
    if (!isMyHubPath(pathname) || loading) return;
    if (!user) {
      router.replace("/login?redirect=/my");
    }
  }, [pathname, router, loading, user]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = `/${locale}/login`;
  }

  if (!isMyHubPath(pathname)) {
    return <>{children}</>;
  }

  if (loading || !me) {
    return <NeonFullPageSpinner label={t("loading")} portal />;
  }

  const showTrialProgress =
    me.plan === "PRO_TRIAL" && (me.trialDaysLeft ?? 0) > 0;

  return (
    <HomeLandingDayNight portal>
      <div className="tkad-landing-neon tkad-planner-neon tkad-portal-shell min-h-[calc(100dvh-4rem)]">
        {isHubHome ? (
          <section className="tkad-home-hero tkad-category-explore-hero relative overflow-hidden bg-gray-50 py-10 text-gray-900 dark:bg-[#05050a] dark:text-white sm:py-14 lg:py-16">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--qp-accent)_8%,transparent),transparent_55%)]"
            />
            <PageContainer className="relative">
              <p className="font-display text-xs font-medium uppercase tracking-[0.24em] text-[color:var(--qp-fg-muted)]">
                {isKo ? "// 마이 허브" : "// My hub"}
              </p>
              <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-[950] leading-[0.95] tracking-[-0.05em]">
                    {t("greeting", { name: me.name })}
                  </h1>
                  <p className="mt-2 truncate text-sm text-gray-600 dark:text-white/60 sm:text-base">
                    {me.email}
                  </p>
                  <MyPlanStatusBadge
                    user={me}
                    isKo={isKo}
                    showPoints={me.pointBalance}
                    className="mt-3"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
                  {me.role === "owner" || me.role === "admin" ? (
                    <Link href="/media-owner/dashboard" className={myHubOutlineBtn}>
                      <Building2 className="h-4 w-4" />
                      {isKo ? "매체사 포털" : "Media portal"}
                    </Link>
                  ) : null}
                  <Link href="/my/api-keys" className={myHubOutlineBtn}>
                    <KeyRound className="h-4 w-4" />
                    {isKo ? "API 키" : "API keys"}
                  </Link>
                  <Link href="/my/settings" className={myHubOutlineBtn}>
                    <Settings className="h-4 w-4" />
                    {isKo ? "설정" : "Settings"}
                  </Link>
                  <button type="button" onClick={logout} className={myHubOutlineBtn}>
                    <LogOut className="h-4 w-4" />
                    {t("logout")}
                  </button>
                </div>
              </div>
            </PageContainer>
          </section>
        ) : (
          <PageContainer className="border-b border-gray-200 py-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href="/my"
                  className="text-xs font-semibold text-[color:var(--qp-accent)]"
                >
                  {isKo ? "← 마이페이지" : "← My hub"}
                </Link>
                <p className="mt-1 truncate text-sm text-gray-500 dark:text-white/50">
                  {me.name}
                </p>
              </div>
              <MyPlanStatusBadge
                user={me}
                isKo={isKo}
                showPoints={me.pointBalance}
              />
            </div>
          </PageContainer>
        )}

        <section className="py-6 sm:py-8 lg:py-10">
          <PageContainer>
            {me.needsEmailVerification ? (
              <EmailVerificationBanner
                onVerified={() => {
                  void refresh({ force: true });
                }}
                className="mb-6"
              />
            ) : null}

            {showTrialProgress ? (
              <ProTrialBanner
                trial={{
                  plan: me.plan!,
                  trialStartedAt: me.trialStartedAt
                    ? String(me.trialStartedAt)
                    : null,
                  trialEndsAt: me.trialEndsAt
                    ? String(me.trialEndsAt)
                    : null,
                  daysLeft: me.trialDaysLeft ?? 0,
                  progressPct: me.trialProgressPct ?? 0,
                }}
                isKo={isKo}
                className="mb-6"
              />
            ) : null}

            <MyHubUpgradeBanner user={me} isKo={isKo} className="mb-6" />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
              <div className="order-1 min-w-0 flex-1 lg:order-2">
                {children}
              </div>
              <div className="order-2 shrink-0 lg:order-1 lg:w-44 xl:w-48">
                <div className="lg:sticky lg:top-[4.5rem]">
                  <div className="lg:hidden">
                    <MyHubGroupNav variant="stack" />
                  </div>
                  <div className="hidden lg:block">
                    <MyHubGroupNav variant="sidebar" />
                  </div>
                </div>
              </div>
            </div>
          </PageContainer>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
