export type SeoGuideTopic = {
  slug: string;
  titleKo: string;
  topicKey: string;
  keywordsKo: string[];
};

/** SEO 키워드 타겟 가이드 5종 — Claude 생성 후 `guide_articles` 저장 */
export const SEO_GUIDE_TOPICS: readonly SeoGuideTopic[] = [
  {
    slug: "ooh-beginner-guide",
    titleKo: "옥외광고 완전 입문 — 처음 시작하는 분을 위한 가이드",
    topicKey: "seo-ooh-beginner",
    keywordsKo: ["옥외광고 방법", "OOH 광고 입문"],
  },
  {
    slug: "ooh-price-guide",
    titleKo: "2026년 옥외광고 단가 완전 가이드",
    topicKey: "seo-ooh-price",
    keywordsKo: [
      "옥외광고 단가",
      "전광판 광고 비용",
      "지하철 광고 가격",
    ],
  },
  {
    slug: "dooh-vs-static",
    titleKo: "DOOH vs 고정형 광고 — 업종별 최적 선택법",
    topicKey: "seo-dooh-vs-static",
    keywordsKo: ["DOOH 광고", "디지털 옥외광고"],
  },
  {
    slug: "fandom-ooh-guide",
    titleKo: "팬덤 OOH 광고 완전 가이드 — 아이돌 생일광고 A to Z",
    topicKey: "seo-fandom-ooh",
    keywordsKo: ["아이돌 생일광고", "팬덤 광고"],
  },
  {
    slug: "ooh-plus-digital",
    titleKo: "OOH + 디지털 통합 마케팅 전략",
    topicKey: "seo-ooh-digital",
    keywordsKo: ["OOH 디지털 통합", "온오프라인 광고"],
  },
] as const;

export const SEO_GUIDE_SLUGS = SEO_GUIDE_TOPICS.map((t) => t.slug);
