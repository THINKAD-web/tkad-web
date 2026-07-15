"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import {
  getPlanCartCount,
  PLAN_CART_CHANGE_EVENT,
  PLAN_CART_KEY,
} from "@/lib/plan-cart";

type TabBadges = {
  contact: number;
  my: number;
  planner: number;
};

const DEFAULT_BADGES: TabBadges = { contact: 0, my: 0, planner: 0 };

const BADGE_REFRESH_MS = 60_000;

/**
 * Fetches unread counts for bottom tab badges.
 * - my: `/api/my/notifications` → unreadCount
 * - contact: chat rooms awaiting advertiser reply
 * - planner: plan cart item count (localStorage)
 */
export function useMobileTabBadges(): TabBadges {
  const { user } = useAuthSession();
  const loggedIn = Boolean(user?.id);
  const [badges, setBadges] = useState<TabBadges>(DEFAULT_BADGES);

  const refreshPlanCount = useCallback(() => {
    setBadges((prev) => ({ ...prev, planner: getPlanCartCount() }));
  }, []);

  const refresh = useCallback(async () => {
    refreshPlanCount();
    if (!loggedIn) {
      setBadges((prev) => ({ contact: 0, my: 0, planner: prev.planner }));
      return;
    }

    try {
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

      setBadges((prev) => ({
        contact: contactCount,
        my: myCount,
        planner: prev.planner,
      }));
    } catch {
      setBadges((prev) => ({ contact: 0, my: 0, planner: prev.planner }));
    }
  }, [loggedIn, refreshPlanCount]);

  useEffect(() => {
    refreshPlanCount();
    const onPlanChange = () => refreshPlanCount();
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLAN_CART_KEY) refreshPlanCount();
    };
    window.addEventListener(PLAN_CART_CHANGE_EVENT, onPlanChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PLAN_CART_CHANGE_EVENT, onPlanChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshPlanCount]);

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
  }, [refresh]);

  return badges;
}
