export type AcademySeedTopicV2 = {
  slug: string;
  title: string;
  category: string;
  level: string;
  targetAudience: string;
  courseId: string;
  order: number;
};

export const ACADEMY_SEED_TOPICS_V2: readonly AcademySeedTopicV2[] = [
  {
    slug: "academy-ooh-complete-intro",
    title: "OOH 광고 완전 입문 — 처음 시작하는 분을 위한 가이드",
    category: "BASIC",
    level: "입문",
    targetAudience: "광고 경험 없는 소상공인·스타트업",
    courseId: "ooh-basics",
    order: 1,
  },
  {
    slug: "academy-cpm-ots-reach",
    title: "CPM·OTS·Reach 완전 정복 — OOH 핵심 지표 이해하기",
    category: "DATA",
    level: "중급",
    targetAudience: "데이터로 광고 효과를 측정하고 싶은 마케터",
    courseId: "ooh-metrics",
    order: 2,
  },
  {
    slug: "academy-ooh-creative-spec",
    title: "OOH 소재 제작 가이드 — 규격부터 디자인 팁까지",
    category: "CREATIVE",
    level: "입문",
    targetAudience: "소재 제작 담당자·디자이너",
    courseId: "ooh-creative",
    order: 3,
  },
  {
    slug: "academy-budget-ooh-strategy",
    title: "예산별 OOH 캠페인 전략 — 100만원부터 1억까지",
    category: "STRATEGY",
    level: "중급",
    targetAudience: "예산 계획을 세우는 마케팅 담당자",
    courseId: "ooh-planning",
    order: 4,
  },
  {
    slug: "academy-fandom-ooh-guide",
    title: "팬덤 OOH 광고 완전 가이드 — 아이돌 생일광고 A to Z",
    category: "SPECIAL",
    level: "입문",
    targetAudience: "팬클럽·엔터 관계자",
    courseId: "ooh-special",
    order: 5,
  },
] as const;

export const ACADEMY_SEED_SYSTEM = `당신은 THINKAD 싱커드의 OOH 광고 교육 콘텐츠 작가입니다.
광고를 처음 접하는 사람도 이해할 수 있게 쉽고 실용적으로 작성하세요.

형식:
- 도입부 (공감 가는 상황 묘사)
- 핵심 내용 (소제목 4~5개, 각 200자 이상)
- 실전 팁 (바로 적용 가능한 3가지)
- 마무리 + 다음 단계 안내`;
