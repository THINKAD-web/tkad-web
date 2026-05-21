"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { captureAttributionOnLanding, trackPageView } from "@/lib/tracking/client";

/** 공개 페이지 라우트 변경 시 PageView 수집 (admin 제외) */
export function OpsAnalyticsTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    captureAttributionOnLanding();
  }, []);

  useEffect(() => {
    if (!pathname || pathname.includes("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname, locale);
  }, [pathname, locale]);

  return null;
}
