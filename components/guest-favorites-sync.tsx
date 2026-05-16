"use client";

import { useEffect, useRef } from "react";
import {
  clearGuestFavorites,
  readGuestFavorites,
} from "@/lib/guest-favorites";

/**
 * 로그인 직후(또는 페이지 로드 시 이미 로그인 상태면) localStorage 의 guest 찜 매체를
 * `/api/my/favorites/sync` 로 일괄 이관하고 큐를 비운다.
 *
 * UI 가 없는 silent 컴포넌트. 헤더 어딘가에 mount 만 해두면 됨.
 *
 * 트리거:
 *   - 첫 마운트 시 1회 시도
 *   - `tkad-guest-favorites-change` 커스텀 이벤트 발생 시 (다른 탭 변경/같은 탭 변경)
 *   - 60초마다 정기 재시도(세션 polling 으로 로그인 상태가 바뀌는 시나리오 대비)
 */
export function GuestFavoritesSync() {
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function attempt() {
      if (inFlight.current || cancelled) return;
      const ids = readGuestFavorites();
      if (ids.length === 0) return;

      inFlight.current = true;
      try {
        const session = await fetch("/api/auth/session", { cache: "no-store" });
        const sd = await session.json();
        if (!sd?.ok || !sd.data) return; // 비로그인 → skip
        const res = await fetch("/api/my/favorites/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaIds: ids }),
        });
        if (res.ok) clearGuestFavorites();
      } catch {
        // 네트워크 실패 시 다음 트리거까지 큐 유지
      } finally {
        inFlight.current = false;
      }
    }

    attempt();

    const onChange = () => void attempt();
    window.addEventListener("tkad-guest-favorites-change", onChange);
    window.addEventListener("focus", onChange);
    const interval = window.setInterval(attempt, 60_000);

    return () => {
      cancelled = true;
      window.removeEventListener("tkad-guest-favorites-change", onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
