"use client";

import { Link } from "@/i18n/navigation";
import { FavoritesSessionSync } from "@/components/favorites-session-sync";
import { HeaderAccountActions } from "@/components/header-account-actions";
import { HeaderCartLink } from "@/components/header-cart-link";
import { HeaderNotificationsBell } from "@/components/header-notifications-bell";
import { headerChromeIconGhostClass } from "@/components/public-chrome/header-chrome-buttons";
import { useCommandPaletteOptional } from "@/components/navigation/command-palette-provider";
import { cn } from "@/lib/utils";
import { MessageSquare, Search } from "lucide-react";

type Props = {
  isKo: boolean;
};

export function HeaderDesktopChrome({ isKo }: Props) {
  const palette = useCommandPaletteOptional();

  return (
    <div className="flex items-center gap-1">
      <FavoritesSessionSync />
      {/* Mobile: drop icon cluster so THINKAD + OOH MKT + account + menu fit SE widths */}
      <button
        type="button"
        onClick={() => palette?.setOpen(true)}
        className={cn(headerChromeIconGhostClass, "max-md:hidden")}
        aria-label={isKo ? "검색 (Cmd+K)" : "Search (Cmd+K)"}
        data-tour="search"
      >
        <Search className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
      <div className="max-md:hidden">
        <HeaderCartLink compact />
      </div>
      <div className="max-md:hidden">
        <HeaderNotificationsBell compact />
      </div>
      <Link
        href="/contact"
        className={cn(headerChromeIconGhostClass, "max-md:hidden")}
        aria-label={isKo ? "문의하기" : "Contact"}
        data-tour="contact"
      >
        <MessageSquare className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </Link>
      <HeaderAccountActions />
    </div>
  );
}
