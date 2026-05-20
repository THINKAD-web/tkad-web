/** 어드민 아카데미 AI 초안 — 카테고리 → 코스·주제 프리셋 */
export type AcademyCategoryId =
  | "ooh-basics"
  | "dooh"
  | "measurement"
  | "planning"
  | "creative"
  | "programmatic";

export type AcademyCategory = {
  id: AcademyCategoryId;
  label: string;
  courseTitle: string;
  lessonTopic: string;
};

export const ACADEMY_ADMIN_CATEGORIES: readonly AcademyCategory[] = [
  {
    id: "ooh-basics",
    label: "OOH 기초",
    courseTitle: "OOH 기초",
    lessonTopic: "옥외광고 매체 유형과 캠페인 설계 입문",
  },
  {
    id: "dooh",
    label: "DOOH·디지털 사이니지",
    courseTitle: "DOOH 실무",
    lessonTopic: "디지털 옥외광고(DOOH) 트렌드와 매체 선정",
  },
  {
    id: "measurement",
    label: "측정·검증",
    courseTitle: "OOH 측정",
    lessonTopic: "노출·OTS·증빙 데이터 해석과 리포팅",
  },
  {
    id: "planning",
    label: "미디어 플래닝",
    courseTitle: "OOH 플래닝",
    lessonTopic: "예산·기간·지역 기반 매체 믹스 설계",
  },
  {
    id: "creative",
    label: "크리에이티브",
    courseTitle: "OOH 크리에이티브",
    lessonTopic: "옥외 크리에이티브 제작 가이드와 사전 심의",
  },
  {
    id: "programmatic",
    label: "프로그래매틱 OOH",
    courseTitle: "프로그래매틱 OOH",
    lessonTopic: "프로그래매틱 DOOH 구매와 운영 체크리스트",
  },
] as const;

export function academyCategoryById(
  id: string,
): AcademyCategory | undefined {
  return ACADEMY_ADMIN_CATEGORIES.find((c) => c.id === id);
}
