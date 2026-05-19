"use client";

import { useEffect, useRef } from "react";
import { syncRecentlyViewedWithServer } from "@/lib/recently-viewed-sync";

/**
 * 로그인 세션이 있을 때 localStorage 최근 본 매체를 서버와 병합합니다.
 */
export default function RecentlyViewedSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await res.json();
        if (cancelled || !data.ok || !data.data) return;
        await syncRecentlyViewedWithServer();
      } catch {
        // ignore — 비로그인·오프라인
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
