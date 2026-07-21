"use client";

import { Link } from "@/i18n/navigation";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";
import { HeaderAccountActions } from "@/components/header-account-actions";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { headerChromeIconGhostClass } from "@/components/public-chrome/header-chrome-buttons";
import { useCommandPaletteOptional } from "@/components/navigation/command-palette-provider";
import { MessageSquare, Search } from "lucide-react";

type Props = {
  isKo: boolean;
};

export function HeaderDesktopChrome({ isKo }: Props) {
  const palette = useCommandPaletteOptional();

  return (
    <div className="flex items-center gap-1">
      <FavoritesSessionSync />
      <button
        type="button"
        onClick={() => palette?.setOpen(true)}
        className={headerChromeIconGhostClass}
        aria-label={isKo ? "검색 (Cmd+K)" : "Search (Cmd+K)"}
        data-tour="search"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      <HeaderNotificationsBell compact />
      <Link
        href="/contact"
        className={headerChromeIconGhostClass}
        aria-label={isKo ? "문의하기" : "Contact"}
        data-tour="contact"
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </Link>
      <HeaderAccountActions />
    </div>
  );
}
