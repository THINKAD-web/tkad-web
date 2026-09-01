"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Megaphone, User as UserIcon } from "lucide-react";
import {
  headerChromeSignupButtonClass,
  headerChromeTextButtonClass,
  headerMobileMenuRowClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { HeaderAccountActions } from "@/components/header-account-actions";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { MyPlanStatusBadge } from "@/components/my/my-plan-status-badge";

const menuRowClass = headerMobileMenuRowClass;

export function HeaderUserMenu({
  onNavigate,
  variant = "inline",
}: {
  onNavigate?: () => void;
  variant?: "inline" | "menu";
}) {
  const t = useTranslations("auth");
  const { user, loading } = useAuthSession();
  const locale = useLocale();
  const isKo = locale === "ko";

  if (loading) return null;

  const session = user?.id
    ? {
        id: user.id,
        email: user.email ?? "",
        name: user.name ?? "",
        role: user.role ?? "ADVERTISER",
        pointBalance: user.pointBalance,
        plan: user.plan,
        trialDaysLeft: user.trialDaysLeft,
      }
    : null;

  if (variant === "menu") {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-white/10">
        <FavoritesSessionSync />
        <HeaderNotificationsBell
          onNavigate={onNavigate}
          variant="menu"
          className={menuRowClass}
        />
        {session ? (
          <>
            <div className="space-y-3 px-5 py-4">
              <p className="truncate tkad-type-title text-gray-900 dark:text-white">
                {session.name}
              </p>
              <MyPlanStatusBadge
                user={session}
                isKo={isKo}
                showPoints={session.pointBalance}
              />
            </div>
            <Link href="/my" onClick={onNavigate} className={menuRowClass}>
              <UserIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{t("myPage")}</span>
            </Link>
            <Link href="/my?tab=campaigns" onClick={onNavigate} className={menuRowClass}>
              <Megaphone className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{t("myCampaigns")}</span>
            </Link>
          </>
        ) : (
          <div className="space-y-2 px-5 py-4">
            <Link
              href="/guide/how-to-use"
              onClick={onNavigate}
              className={`${headerChromeTextButtonClass} min-h-11 w-full`}
            >
              {t("usageGuide")}
            </Link>
            <Link
              href="/login"
              onClick={onNavigate}
              className={`${headerChromeTextButtonClass} min-h-11 w-full`}
            >
              {t("login")}
            </Link>
            <Link
              href="/signup"
              onClick={onNavigate}
              className={`${headerChromeSignupButtonClass} min-h-11 w-full`}
            >
              {t("signup")}
            </Link>
          </div>
        )}
      </div>
    );
  }

  return <HeaderAccountActions onNavigate={onNavigate} />;
}
