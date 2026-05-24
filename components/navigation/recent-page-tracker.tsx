"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { pushRecentPage } from "@/lib/navigation/recent-pages";
import { resolveContextSidebar } from "@/lib/navigation/context-sidebar-config";

const SKIP_PREFIXES = ["/admin", "/login", "/register", "/signup"];

export function RecentPageTracker() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";

  useEffect(() => {
    if (!pathname || SKIP_PREFIXES.some((p) => pathname.includes(p))) return;
    const config = resolveContextSidebar(pathname);
    pushRecentPage({
      href: pathname,
      labelKo: config.titleKo,
      labelEn: config.titleEn,
    });
  }, [pathname, isKo]);

  return null;
}
