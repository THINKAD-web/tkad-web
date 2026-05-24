"use client";

import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { MobileHeader, type MobileHeaderPattern } from "@/components/mobile/mobile-header";
import { useMobileDetailChromeOptional } from "@/components/mobile/mobile-detail-chrome-context";

const TITLE_MAP: Record<string, { ko: string; en: string }> = {
  "/media": { ko: "매체 탐색", en: "Explore media" },
  "/media/map": { ko: "지도 보기", en: "Map view" },
  "/planner": { ko: "캠페인 플래너", en: "Campaign planner" },
  "/contact": { ko: "문의하기", en: "Contact" },
  "/my": { ko: "마이페이지", en: "My page" },
  "/points": { ko: "포인트", en: "Points" },
  "/cases": { ko: "성공 사례", en: "Case studies" },
  "/search": { ko: "검색", en: "Search" },
};

function resolveHeader(pathname: string | null): {
  pattern: MobileHeaderPattern;
  title?: string;
  rightAction?: "search" | "filter" | "share" | "none";
} | null {
  if (!pathname) return null;
  if (
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register")
  ) {
    return null;
  }

  if (pathname === "/" || pathname === "") {
    return { pattern: "home" };
  }

  const mediaDetail = /^\/media\/[^/]+$/.test(pathname);
  if (mediaDetail && !pathname.startsWith("/media/map")) {
    return { pattern: "detail", title: "매체 상세", rightAction: "none" };
  }

  const caseDetail = /^\/cases\/[^/]+$/.test(pathname);
  if (caseDetail) {
    return { pattern: "detail", title: "성공 사례", rightAction: "none" };
  }

  if (pathname.startsWith("/media")) {
    return { pattern: "general", title: "매체 탐색", rightAction: "search" };
  }

  for (const [prefix, labels] of Object.entries(TITLE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return {
        pattern: "general",
        title: labels.ko,
        rightAction: prefix === "/my" ? "none" : "search",
      };
    }
  }

  return { pattern: "general", title: "THINKAD", rightAction: "search" };
}

export function MobileAutoHeader() {
  const pathname = usePathname();
  const locale = useLocale();
  const isKo = locale === "ko";
  const detailChrome = useMobileDetailChromeOptional();
  const resolved = resolveHeader(pathname);

  if (!resolved) return null;

  const titleFromMap =
    resolved.title && TITLE_MAP[pathname ?? ""]
      ? TITLE_MAP[pathname ?? ""]![isKo ? "ko" : "en"]
      : resolved.title;

  const title =
    resolved.pattern === "detail" && detailChrome?.detail.title
      ? detailChrome.detail.title
      : titleFromMap;

  return (
    <MobileHeader
      pattern={resolved.pattern}
      title={title}
      rightAction={resolved.rightAction}
      sheetItems={
        resolved.pattern === "detail" ? detailChrome?.detail.sheetItems ?? [] : undefined
      }
      sheetTitle={title}
    />
  );
}
