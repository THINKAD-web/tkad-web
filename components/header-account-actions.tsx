"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { HeaderGuestMenu } from "@/components/header-guest-menu";
import { HeaderProfileDropdown } from "@/components/header-profile-dropdown";

/** 데스크톱 헤더 우측 — 로그인/회원가입 또는 마이페이지 프로필만 */
export function HeaderAccountActions({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("auth");
  const { user, loading } = useAuthSession();

  if (loading) return null;

  if (user?.id) {
    return (
      <HeaderProfileDropdown
        session={{
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          role: user.role ?? "ADVERTISER",
          pointBalance: user.pointBalance,
          plan: user.plan,
          trialDaysLeft: user.trialDaysLeft,
        }}
        onNavigate={onNavigate}
        myPageLabel={t("myPage")}
        campaignsLabel={t("myCampaigns")}
        logoutLabel={t("logout")}
        pointsShopLabel={t("pointsShop")}
        referralLabel={t("referralInvite")}
      />
    );
  }

  return (
    <div className="ml-1 flex items-center gap-1">
      <HeaderGuestMenu />
      <Link
        href="/signup"
        onClick={onNavigate}
        className="tkad-qp-cta inline-flex rounded-[var(--qp-radius-md)] border border-[color:var(--qp-accent)] bg-[color:var(--qp-accent)] px-2.5 py-1.5 tkad-type-title transition-colors hover:bg-[color:var(--qp-accent-hover)]"
      >
        {t("signup")}
      </Link>
    </div>
  );
}
