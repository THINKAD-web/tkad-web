export type CaseSeedTopic = {
  brandName: string;
  industry: string;
  region: string;
  mediaType: string;
  budget: string;
  period: string;
  goal: string;
};

export const CASE_SEED_TOPICS: readonly CaseSeedTopic[] = [
  {
    brandName: "글로벌 뷰티 브랜드 A사",
    industry: "뷰티",
    region: "강남",
    mediaType: "DOOH",
    budget: "월 1,500만원",
    period: "3개월",
    goal: "신제품 론칭 인지도",
  },
  {
    brandName: "국내 IT 스타트업 B사",
    industry: "IT/앱",
    region: "홍대·신촌",
    mediaType: "지하철",
    budget: "월 500만원",
    period: "2개월",
    goal: "앱 다운로드 유도",
  },
  {
    brandName: "대형 엔터테인먼트 C사",
    industry: "엔터",
    region: "강남역·코엑스",
    mediaType: "DOOH + 지하철",
    budget: "월 3,000만원",
    period: "1개월",
    goal: "아이돌 컴백 팬덤 광고",
  },
  {
    brandName: "F&B 프랜차이즈 D사",
    industry: "F&B",
    region: "성수·한남",
    mediaType: "버스쉘터 + DOOH",
    budget: "월 800만원",
    period: "2개월",
    goal: "신규 매장 오픈 알리기",
  },
  {
    brandName: "패션 브랜드 E사",
    industry: "패션",
    region: "홍대",
    mediaType: "빌보드",
    budget: "월 1,200만원",
    period: "3개월",
    goal: "브랜드 리포지셔닝",
  },
] as const;

export const CASE_SEED_SYSTEM = `당신은 THINKAD 싱커드의 OOH 캠페인 전문가입니다.
실제 집행 사례처럼 자연스러운 성공 사례를 작성하세요.
모든 브랜드명은 익명 처리합니다.

형식:
- 캠페인 배경 (왜 OOH를 선택했나)
- 전략 (어떤 매체를 왜 선택했나)
- 집행 내용 (구체적인 매체, 기간, 소재)
- 성과 (노출수, CPM, 정성적 효과)
- 시사점`;

export function caseSeedTitle(topic: CaseSeedTopic): string {
  return `${topic.industry} 브랜드의 OOH 캠페인 성공기`;
}
