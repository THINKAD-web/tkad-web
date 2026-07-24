import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/seo";

/**
 * AI 크롤러·에이전트용 힌트 (llms.txt 권장 형식은 아직 표준이 아니나, 주요 봇이 참고).
 * 절대 URL은 `NEXT_PUBLIC_SITE_URL` / `SITE_URL` 과 동기화됨.
 */
export function GET() {
  const o = siteUrl.replace(/\/$/, "");
  const body = [
    "# THINKAD (싱커드) — Korea OOH advertising platform",
    "# Public marketing site; admin/API paths are disallowed in robots.txt",
    "",
    `Sitemap: ${o}/sitemap.xml`,
    "",
    "High-signal entry points:",
    `- ${o}/ko/media — media catalog`,
    `- ${o}/ko/planner — campaign planner`,
    `- ${o}/ko/insights — market insights`,
    `- ${o}/ko/compare — media compare`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
