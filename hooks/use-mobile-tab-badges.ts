"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

type TabBadges = {
  contact: number;
  my: number;
};

const DEFAULT_BADGES: TabBadges = { contact: 0, my: 0 };

/** Placeholder fallbacks when logged out or API unavailable. */
const PLACEHOLDER_BADGES: TabBadges = { contact: 1, my: 3 };

/**
 * Fetches unread counts for bottom tab badges.
 * - my: `/api/my/notifications` → unreadCount
 * - contact: chat rooms needing advertiser attention (fallback placeholder)
 */
export function useMobileTabBadges(): TabBadges {
  const pathname = usePathname();
  const [badges, setBadges] = useState<TabBadges>(DEFAULT_BADGES);

  const refresh = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await sessionRes.json();
      if (!sessionData?.ok || !sessionData.data) {
        setBadges(DEFAULT_BADGES);
        return;
      }

      const [notifRes, chatRes] = await Promise.all([
        fetch("/api/my/notifications?limit=1", { cache: "no-store" }),
        fetch("/api/chat/rooms?side=advertiser", { cache: "no-store" }),
      ]);

      let myCount = PLACEHOLDER_BADGES.my;
      let contactCount = PLACEHOLDER_BADGES.contact;

      const notifData = await notifRes.json();
      if (notifData?.ok && typeof notifData.data?.unreadCount === "number") {
        myCount = notifData.data.unreadCount;
      }

      const chatData = await chatRes.json();
      if (chatData?.ok && Array.isArray(chatData.data?.items)) {
        const pending = chatData.data.items.filter(
          (room: { ownerReplied?: boolean }) => !room.ownerReplied,
        ).length;
        if (pending > 0) contactCount = pending;
      }

      setBadges({ contact: contactCount, my: myCount });
    } catch {
      setBadges(DEFAULT_BADGES);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  return badges;
}
