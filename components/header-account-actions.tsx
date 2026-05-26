"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HeaderGuestMenu } from "@/components/header-guest-menu";
import { HeaderProfileDropdown } from "@/components/header-profile-dropdown";

type Session = {
  id: string;
  email: string;
  name: string;
  role: string;
  pointBalance?: number;
  plan?: string;
  trialDaysLeft?: number;
} | null;

function useSession() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setSession(d?.ok ? d.data : null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return { session, loaded };
}

/** 데스크톱 헤더 우측 — 로그인/회원가입 또는 마이페이지 프로필만 */
export function HeaderAccountActions({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("auth");
  const { session, loaded } = useSession();

  if (!loaded) return null;

  if (session) {
    return (
      <HeaderProfileDropdown
        session={session}
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
        className="inline-flex rounded-lg px-2.5 py-1.5 text-sm font-semibold tkad-neon-cta-clean text-white"
      >
        {t("signup")}
      </Link>
    </div>
  );
}
