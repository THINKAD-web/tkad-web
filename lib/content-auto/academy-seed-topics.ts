export type AcademySeedTopic = {
  courseId: string;
  courseTitle: string;
  lessonTitleKo: string;
  order: number;
};

export const ACADEMY_SEED_TOPICS: readonly AcademySeedTopic[] = [
  {
    courseId: "ooh-basics",
    courseTitle: "OOH 기초",
    lessonTitleKo: "옥외광고 기초 — 매체 유형 한 번에 이해하기",
    order: 1,
  },
  {
    courseId: "ooh-metrics",
    courseTitle: "OOH 지표",
    lessonTitleKo: "CPM·도달·빈도 — OOH 핵심 지표 완전 정복",
    order: 2,
  },
  {
    courseId: "ooh-creative",
    courseTitle: "OOH 소재",
    lessonTitleKo: "소재 제작 가이드 — 디자이너가 알려주는 OOH 스펙",
    order: 3,
  },
] as const;
