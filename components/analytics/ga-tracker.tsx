"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * App Router(SPA)에서 클라이언트 라우트 변경 시 GA4 page_view 를 수동 전송.
 * GA4 `gtag('config')` 는 최초 1회만 page_view 를 보내므로 네비게이션마다 보강.
 * 반드시 <Suspense> 로 감싸 사용 (useSearchParams 요구).
 */
export function GaTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    // 관리자/클라이언트 콘솔은 GA 미로딩 → 전송 안 함
    if (/^\/(?:ko|en)\/(?:admin|client)(?:\/|$)/.test(pathname)) return;
    const query = searchParams?.toString();
    const path = query ? `${pathname}?${query}` : pathname;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}
