/** 교육 콘텐츠 주제 풀 (주 1회 로테이션) */
export const EDUCATION_TOPIC_POOL = [
  {
    key: "flyer-vs-ooh",
    title: "전단지 vs 옥외광고, 뭐가 더 효율적일까?",
  },
  {
    key: "bus-shelter-howto",
    title: "우리 가게 주변 버스쉘터 광고, 어떻게 신청하나요?",
  },
  {
    key: "instagram-vs-subway",
    title: "인스타그램 광고 vs 지하철 광고 비교",
  },
  {
    key: "popup-ooh",
    title: "팝업 스토어 할 때 OOH 광고 활용법",
  },
  {
    key: "budget-200man",
    title: "예산 200만원으로 할 수 있는 옥외광고",
  },
  {
    key: "brand-awareness-ooh",
    title: "브랜드 인지도를 빠르게 올리는 OOH 전략",
  },
] as const;

/** 광고주 가이드 주제 풀 (주 2회 로테이션) */
export const GUIDE_TOPIC_POOL = [
  { key: "beauty-media", title: "업종별 OOH 매체 선택 가이드 — 뷰티편" },
  { key: "creative-checklist", title: "OOH 소재 제작 체크리스트 10가지" },
  { key: "dooh-daypart", title: "DOOH 시간대별 송출 전략" },
  { key: "gangnam-hongdae-seongsu", title: "강남 vs 홍대 vs 성수, 어디서 광고해야 할까" },
  { key: "ooh-digital-mix", title: "OOH + 디지털 믹스 전략으로 효과 2배 내기" },
  { key: "season-calendar", title: "시즌별 OOH 캠페인 캘린더" },
] as const;

export function pickTopicByWeek<T extends { key: string }>(
  pool: readonly T[],
  weekOffset = 0,
): T {
  const week = Math.floor(Date.now() / (7 * 86400_000)) + weekOffset;
  return pool[week % pool.length]!;
}

export function pickGuideTopicsBiweekly(): { key: string; title: string }[] {
  const week = Math.floor(Date.now() / (7 * 86400_000));
  const a = GUIDE_TOPIC_POOL[week % GUIDE_TOPIC_POOL.length]!;
  const b = GUIDE_TOPIC_POOL[(week + 1) % GUIDE_TOPIC_POOL.length]!;
  return a.key === b.key ? [a] : [a, b];
}
