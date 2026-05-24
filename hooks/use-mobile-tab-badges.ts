"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

type TabBadges = {
  contact: number;
  my: number;
};

const DEFAULT_BADGES: TabBadges = { contact: 0, my: 0 };

const BADGE_REFRESH_MS = 60_000;

/**
 * Fetches unread counts for bottom tab badges.
 * - my: `/api/my/notifications` → unreadCount
 * - contact: chat rooms awaiting advertiser reply
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

      let myCount = 0;
      let contactCount = 0;

      const notifData = await notifRes.json();
      if (notifData?.ok && typeof notifData.data?.unreadCount === "number") {
        myCount = Math.max(0, notifData.data.unreadCount);
      }

      const chatData = await chatRes.json();
      if (chatData?.ok && Array.isArray(chatData.data?.items)) {
        contactCount = chatData.data.items.filter(
          (room: { ownerReplied?: boolean }) => !room.ownerReplied,
        ).length;
      }

      setBadges({ contact: contactCount, my: myCount });
    } catch {
      setBadges(DEFAULT_BADGES);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), BADGE_REFRESH_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, refresh]);

  return badges;
}
