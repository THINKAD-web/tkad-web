"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Megaphone, User as UserIcon } from "lucide-react";
import {
  headerChromeSignupButtonClass,
  headerChromeTextButtonClass,
  headerMobileMenuRowClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { HeaderAccountActions } from "@/components/header-account-actions";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { HeaderCartLink } from "@/components/header-cart-link";

type Session = {
  id: string;
  email: string;
  name: string;
  role: string;
  pointBalance?: number;
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

const menuRowClass = headerMobileMenuRowClass;

export function HeaderUserMenu({
  onNavigate,
  variant = "inline",
}: {
  onNavigate?: () => void;
  variant?: "inline" | "menu";
}) {
  const t = useTranslations("auth");
  const { session, loaded } = useSession();

  if (!loaded) return null;

  if (variant === "menu") {
    return (
      <div className="divide-y divide-zinc-200 dark:divide-white/10">
        <FavoritesSessionSync />
        <HeaderFavoritesLink
          onNavigate={onNavigate}
          variant="menu"
          className={menuRowClass}
        />
        <HeaderNotificationsBell
          onNavigate={onNavigate}
          variant="menu"
          className={menuRowClass}
        />
        <HeaderCartLink onNavigate={onNavigate} variant="menu" className={menuRowClass} />
        {session ? (
          <>
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
