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
 *
 * Meta-ExternalAgent / Amazonbot 은 사이트 전체 차단 — 둘 다 AI 학습용
 * 크롤러로, SNS 링크 미리보기(facebookexternalhit, 별도 UA)나 Alexa/Kindle
 * 연동(Amzn-SearchBot/Amzn-User, 별도 UA)과는 무관해 차단해도 실사용자 경험에
 * 영향 없음. `/media/[slug]` ISR Write Utilization 0.7×(1× 미만 — 거의 안
 * 읽히는 페이지를 계속 재생성 중) 확인 후 조치. 두 봇 다 robots.txt 준수가
 * 공식적으로 확인돼 있어 이 방식으로 충분함(PerplexityBot 은 준수가 불확실해
 * 별도 Firewall 대응 필요 — 이번 변경 범위 밖).
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
      // Meta AI 학습 크롤러 — 링크 미리보기(facebookexternalhit)와는 별개 UA
      { userAgent: "Meta-ExternalAgent", disallow: "/" },
      // Amazon AI 학습 크롤러 — Alexa/Kindle 연동(Amzn-SearchBot/Amzn-User)과는 별개 UA
      { userAgent: "Amazonbot", disallow: "/" },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
