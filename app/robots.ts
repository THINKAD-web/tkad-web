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
 * 모두 동일 disallow 정책. `app/llms.txt` 는 AI 에이전트용 안내일 뿐 접근
 * 제어 기능이 없어서, 실제 차단은 아래 disallow 규칙이 담당한다.
 *
 * AI 크롤러 정책 — "학습용은 차단, 실시간 조회·인용용은 허용":
 * - 차단: Meta-ExternalAgent, Amazonbot, ClaudeBot, GPTBot (전부 모델 학습용)
 * - 허용(별도 UA 라 위 `*` 규칙 적용): facebookexternalhit(SNS 링크 미리보기),
 *   Amzn-SearchBot/Amzn-User(Alexa·Kindle), Claude-SearchBot/Claude-User,
 *   OAI-SearchBot/ChatGPT-User(ChatGPT 검색 인용 — 차단하면 THINKAD 가 AI
 *   답변에 인용될 기회를 잃으므로 의도적으로 허용)
 *
 * 배경: `/media/[slug]` ISR Write Utilization 0.7×→0.5× (1× 미만 = 거의 안
 * 읽히는 페이지를 계속 재생성 중). 위 4개 봇 모두 robots.txt 준수가 공식
 * 확인돼 있어 이 방식으로 충분함. PerplexityBot 은 준수가 불확실해
 * (Cloudflare 의 UA/IP 우회 증거) Firewall 대응이 필요 — 이번 범위 밖.
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
      // Anthropic 학습 크롤러 — Claude 검색 인덱싱(Claude-SearchBot)·사용자 요청
      // 조회(Claude-User)는 별개 UA 라 위 `*` 규칙대로 계속 허용됨
      { userAgent: "ClaudeBot", disallow: "/" },
      // OpenAI 학습 크롤러 — ChatGPT 검색 인용(OAI-SearchBot)·사용자 요청
      // 조회(ChatGPT-User)는 별개 UA 라 위 `*` 규칙대로 계속 허용됨
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
