"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  headerChromeIconButtonClass,
  headerChromeIconGhostClass,
  headerMobileMenuRowClass,
} from "@/components/public-chrome/header-chrome-buttons";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";
import {
  getGuestFavoriteIds,
  subscribeFavorites,
} from "@/lib/favorites-client";

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
  compact = false,
}: {
  onNavigate?: () => void;
  variant?: "icon" | "menu";
  className?: string;
  compact?: boolean;
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
  const favoritesHref =
    loggedIn === true ? "/my?tab=favorites" : "/media/favorites";

  if (variant === "menu") {
    return (
      <Link
        href={favoritesHref}
        onClick={onNavigate}
        className={className}
        aria-label={aria}
      >
        <Heart className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="flex-1">{t("menuLabel")}</span>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white ring-1 ring-white/80 dark:ring-[#05050a]">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={favoritesHref}
      onClick={onNavigate}
      className={cn(
        "relative",
        compact ? headerChromeIconGhostClass : headerChromeIconButtonClass,
        className,
      )}
      aria-label={aria}
    >
      <Heart className="h-4 w-4" strokeWidth={2} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white ring-1 ring-white/80 dark:ring-[#05050a]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
