import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * robots.ts
 *
 * 한국 검색엔진(Naver / Daum / Zum) 명시 룰 + 글로벌(*) 룰.
 * - Yeti   : Naver search bot
 * - Daumoa : Kakao(Daum) search bot
 * - Zumbot : Zum search bot
 *
 * 모두 동일 disallow 정책. AI 크롤러(GPTBot 등) 는 `app/llms.txt` 가 처리.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl.replace(/\/$/, "");
  const disallow = [
    "/api/",
    "/admin/",
    "/ko/admin",
    "/en/admin",
    "/ko/admin/",
    "/en/admin/",
    "/client",
    "/ko/client",
    "/en/client",
    "/ko/client/",
    "/en/client/",
    "/offline",
    "/ko/offline",
    "/en/offline",
  ];

  return {
    host: origin,
    rules: [
      // Google
      { userAgent: "Googlebot", allow: "/", disallow },
      // 글로벌 검색 봇 (Bing 등)
      { userAgent: "*", allow: "/", disallow },
      // Naver
      { userAgent: "Yeti", allow: "/", disallow },
      // Daum / Kakao
      { userAgent: "Daumoa", allow: "/", disallow },
      // Zum
      { userAgent: "Zumbot", allow: "/", disallow },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
