"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { syncRecentlyViewedWithServer } from "@/lib/recently-viewed-sync";

/**
 * 로그인 세션이 있을 때 localStorage 최근 본 매체를 서버와 병합합니다.
 */
export default function RecentlyViewedSync() {
  const { user, loading } = useAuthSession();
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const userId = user?.id ?? null;
    if (!userId) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === userId) return;

    let cancelled = false;
    (async () => {
      try {
        await syncRecentlyViewedWithServer();
        if (!cancelled) syncedUserIdRef.current = userId;
      } catch {
        // ignore — 오프라인 등
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, user?.id]);

  return null;
}
