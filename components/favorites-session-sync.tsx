"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { mergeGuestFavoritesToAccount } from "@/lib/favorites-client";
import { FAVORITES_CHANGE_EVENT } from "@/lib/favorites-constants";

/** 로그인 시 게스트 localStorage 찜을 계정 DB로 병합 */
export function FavoritesSessionSync() {
  const pathname = usePathname();
  const mergedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !data?.ok || !data.data) {
          mergedRef.current = false;
          return;
        }
        if (mergedRef.current) return;
        await mergeGuestFavoritesToAccount();
        mergedRef.current = true;
        window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
