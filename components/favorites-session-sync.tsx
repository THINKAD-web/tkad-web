"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import { mergeGuestFavoritesToAccount } from "@/lib/favorites-client";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";

/** 로그인 시 게스트 localStorage 찜을 계정 DB로 병합 */
export function FavoritesSessionSync() {
  const { user } = useAuthSession();
  const mergedRef = useRef(false);
  const mergedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) {
      mergedRef.current = false;
      mergedUserIdRef.current = null;
      return;
    }
    if (mergedRef.current && mergedUserIdRef.current === userId) return;

    let cancelled = false;
    (async () => {
      try {
        await mergeGuestFavoritesToAccount();
        if (cancelled) return;
        mergedRef.current = true;
        mergedUserIdRef.current = userId;
        window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return null;
}
