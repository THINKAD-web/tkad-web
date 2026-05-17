"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getGuestFavoriteIds,
  subscribeFavorites,
} from "@/lib/favorites-client";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";

function useGuestFavoriteCount() {
  return useSyncExternalStore(
    subscribeFavorites,
    () => getGuestFavoriteIds().length,
    () => 0,
  );
}

export function HeaderFavoritesLink({
  onNavigate,
  variant = "icon",
  className,
}: {
  onNavigate?: () => void;
  variant?: "icon" | "menu";
  className?: string;
}) {
  const t = useTranslations("media.favorites");
  const pathname = usePathname();
  const guestCount = useGuestFavoriteCount();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [serverCount, setServerCount] = useState(0);

  const refreshServerCount = useCallback(async () => {
    try {
      const s = await fetch("/api/auth/session", { cache: "no-store" });
      const sd = await s.json();
      if (!sd?.ok || !sd.data) {
        setLoggedIn(false);
        setServerCount(0);
        return;
      }
      setLoggedIn(true);
      const r = await fetch("/api/my/favorites", { cache: "no-store" });
      const rd = await r.json();
      if (rd?.ok && typeof rd.data?.total === "number") {
        setServerCount(rd.data.total);
      }
    } catch {
      setLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    void refreshServerCount();
  }, [pathname, refreshServerCount]);

  useEffect(() => {
    const onChange = () => {
      void refreshServerCount();
    };
    window.addEventListener(FAVORITES_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(FAVORITES_CHANGE_EVENT, onChange);
  }, [refreshServerCount]);

  const count = loggedIn === true ? serverCount : guestCount;
  const aria =
    count > 0 ? t("headerAriaCount", { count }) : t("headerAria");

  if (variant === "menu") {
    return (
      <Link
        href="/media/favorites"
        onClick={onNavigate}
        className={className}
        aria-label={aria}
      >
        <Heart className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1">{t("menuLabel")}</span>
        {count > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1.5 text-[10px] font-bold text-white dark:from-violet-500 dark:to-cyan-400">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href="/media/favorites"
      onClick={onNavigate}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-violet-600 hover:bg-secondary/60 active:scale-95 transition-all duration-150 dark:hover:text-cyan-300"
      aria-label={aria}
    >
      <Heart className="h-4 w-4" strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 px-1 text-[10px] font-bold text-white shadow-[0_2px_10px_rgba(124,58,237,0.38)] ring-1 ring-white/30 dark:from-violet-500 dark:to-cyan-400 dark:shadow-[0_0_14px_rgba(34,211,238,0.28)] dark:ring-white/20">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
