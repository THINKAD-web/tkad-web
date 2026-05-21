export type GuideSeedTopic = {
  slug: string;
  titleKo: string;
  topicKey: string;
};

export const GUIDE_SEED_TOPICS: readonly GuideSeedTopic[] = [
  {
    slug: "guide-ooh-faq-20",
    titleKo: "OOH 광고 처음 시작할 때 자주 묻는 질문 20가지",
    topicKey: "seed-faq-20",
  },
  {
    slug: "guide-budget-3m-first-campaign",
    titleKo: "예산 300만원으로 시작하는 첫 OOH 캠페인",
    topicKey: "seed-budget-3m",
  },
  {
    slug: "guide-region-gangnam-hongdae-seongsu",
    titleKo: "강남 vs 홍대 vs 성수 — 우리 브랜드에 맞는 지역 선택법",
    topicKey: "seed-region-pick",
  },
] as const;
