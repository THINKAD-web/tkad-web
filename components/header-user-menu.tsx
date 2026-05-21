"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Megaphone, ShoppingCart, User as UserIcon } from "lucide-react";
import {
  headerChromeSignupButtonClass,
  headerChromeTextButtonClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { HeaderProfileDropdown } from "@/components/header-profile-dropdown";
import { useCart } from "@/lib/cart";
import { HeaderFavoritesLink } from "@/components/header-favorites-link";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";

type Session = { id: string; email: string; name: string; role: string } | null;

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

const menuRowClass =
  "flex min-h-[3.25rem] items-center gap-3 px-5 py-3 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:text-white text-gray-900 dark:hover:dark:bg-white/6 bg-gray-50";

export function HeaderUserMenu({
  onNavigate,
  variant = "inline",
}: {
  onNavigate?: () => void;
  variant?: "inline" | "menu";
}) {
  const locale = useLocale();
  const t = useTranslations("auth");
  const { session, loaded } = useSession();
  const { ids } = useCart();

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
        <Link
          href="/cart"
          onClick={onNavigate}
          className={menuRowClass}
          aria-label={`${locale === "ko" ? "장바구니" : "Cart"}${ids.length > 0 ? ` (${ids.length})` : ""}`}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="flex-1">{locale === "ko" ? "장바구니" : "Cart"}</span>
          {ids.length > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1.5 text-[10px] font-bold dark:text-white text-gray-900 dark:from-violet-500 dark:to-cyan-400">
              {ids.length}
            </span>
          ) : null}
        </Link>
        {session ? (
          <>
            <Link href="/my" onClick={onNavigate} className={menuRowClass}>
              <UserIcon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{t("myPage")}</span>
            </Link>
            <Link href="/dashboard" onClick={onNavigate} className={menuRowClass}>
              <Megaphone className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{t("myCampaigns")}</span>
            </Link>
          </>
        ) : (
          <div className="space-y-2 px-5 py-4">
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

  return (
    <div className="flex items-center gap-1.5">
      <FavoritesSessionSync />
      <HeaderFavoritesLink onNavigate={onNavigate} />
      <HeaderNotificationsBell onNavigate={onNavigate} />
      <Link
        href="/cart"
        onClick={onNavigate}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all duration-150 hover:bg-secondary/60 hover:text-violet-600 active:scale-95 dark:hover:text-cyan-300"
        aria-label={`${locale === "ko" ? "장바구니" : "Cart"}${ids.length > 0 ? ` (${ids.length})` : ""}`}
      >
        <ShoppingCart className="h-4 w-4" strokeWidth={2} />
        {ids.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1 text-[10px] font-bold dark:text-white text-gray-900 shadow-[0_2px_10px_rgba(124,58,237,0.38)] ring-1 ring-white/30 dark:from-violet-500 dark:to-cyan-400 dark:shadow-[0_0_14px_rgba(34,211,238,0.28)] dark:ring-white/20">
            {ids.length}
          </span>
        )}
      </Link>
      {session ? (
        <>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60 dark:text-white text-gray-900 dark:hover:dark:bg-white/10 bg-gray-100"
          >
            <Megaphone className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">{t("myCampaigns")}</span>
          </Link>
          <HeaderProfileDropdown
            session={session}
            onNavigate={onNavigate}
            myPageLabel={t("myPage")}
            campaignsLabel={t("myCampaigns")}
            logoutLabel={t("logout")}
          />
        </>
      ) : (
        <>
          <Link
            href="/login"
            onClick={onNavigate}
            className={headerChromeTextButtonClass}
          >
            {t("login")}
          </Link>
          <Link href="/signup" onClick={onNavigate} className={headerChromeSignupButtonClass}>
            {t("signup")}
          </Link>
        </>
      )}
    </div>
  );
}
