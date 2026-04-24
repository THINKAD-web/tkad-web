/**
 * 고객 후기 데이터 — 실명/로고 허용 시 이 파일에서 교체하면 홈의 후기 캐러셀이 자동 갱신.
 *
 * - `initials` + `avatarGradient` : 익명/로고 미확보 시 표시되는 아바타
 * - `logoUrl` : 실제 회사 로고가 확보되면 `public/images/testimonials/logo-*.png` 경로
 * - `metric` : 성과 수치 하이라이트 (카드 상단에 크게 표시)
 * - `caseHref` : 해당 캠페인의 /cases 상세 링크 (없으면 null → CTA 생략)
 */

export type Testimonial = {
  id: string;
  /** 한국어 이름 (익명이면 "김서연 이사" 등) */
  nameKo: string;
  nameEn: string;
  /** 직책 */
  roleKo: string;
  roleEn: string;
  /** 회사명 */
  companyKo: string;
  companyEn: string;
  /** 회사 설명 (산업 라인) */
  industryKo: string;
  industryEn: string;
  /** 후기 본문 */
  bodyKo: string;
  bodyEn: string;
  /** 성과 수치 — 예: "+300%", "2주 만에 150만 노출" */
  metricKo: string;
  metricEn: string;
  /** 별점 (1~5) */
  rating: 1 | 2 | 3 | 4 | 5;
  /** 이니셜 (아바타 fallback) */
  initials: string;
  /** Tailwind 그라디언트 — 기본값 brand navy→gold */
  avatarGradient?: string;
  /** 실제 아바타 이미지 (없으면 initials fallback) */
  avatarUrl?: string | null;
  /** 회사 로고 (public/images/testimonials/ 에 위치 권장, 없으면 null) */
  logoUrl?: string | null;
  /** 연관 성공 사례 slug (없으면 null) */
  caseHref?: string | null;
};

export const testimonials: Testimonial[] = [
  {
    id: "beauty-brand-a",
    nameKo: "김서연 마케팅 이사",
    nameEn: "Seoyeon Kim, Marketing Director",
    roleKo: "마케팅 이사",
    roleEn: "Marketing Director",
    companyKo: "글로벌 뷰티 브랜드 A사",
    companyEn: "Global Beauty Brand A",
    industryKo: "뷰티 · 코스메틱",
    industryEn: "Beauty · Cosmetics",
    bodyKo:
      "싱커드 덕분에 강남역 일대 10개 빌보드를 동시에 진행할 수 있었습니다. 매체 하나하나 직접 검증해준 데이터 덕에 안심하고 결정할 수 있었어요.",
    bodyEn:
      "Thanks to THINKAD, we ran 10 billboards simultaneously around Gangnam Station. The verified data for each media gave us the confidence to decide.",
    metricKo: "브랜드 인지도 +300%",
    metricEn: "Brand awareness +300%",
    rating: 5,
    initials: "김서",
    avatarGradient: "from-rose-400 to-orange-400",
    avatarUrl: null,
    logoUrl: null,
    caseHref: null,
  },
  {
    id: "tech-startup-b",
    nameKo: "박준혁 대표",
    nameEn: "Junhyuk Park, CEO",
    roleKo: "대표이사",
    roleEn: "CEO",
    companyKo: "테크 스타트업 B사",
    companyEn: "Tech Startup B",
    industryKo: "SaaS · 핀테크",
    industryEn: "SaaS · Fintech",
    bodyKo:
      "스타트업이라 광고 예산이 빠듯했는데, 싱커드가 데이터 기반으로 가장 효율적인 매체 조합을 제안해줬습니다. 계약부터 사후관리까지 원스톱이라 정말 편했습니다.",
    bodyEn:
      "As a startup with a tight budget, THINKAD proposed the most efficient media mix based on data. The one-stop service from contract to post-care was incredibly convenient.",
    metricKo: "2주 만에 150만 노출",
    metricEn: "1.5M impressions in 2 weeks",
    rating: 5,
    initials: "박준",
    avatarGradient: "from-indigo-400 to-cyan-400",
    avatarUrl: null,
    logoUrl: null,
    caseHref: null,
  },
  {
    id: "entertainment-c",
    nameKo: "이하은 팀장",
    nameEn: "Haeun Lee, Team Lead",
    roleKo: "마케팅 팀장",
    roleEn: "Marketing Team Lead",
    companyKo: "엔터테인먼트 C사",
    companyEn: "Entertainment Company C",
    industryKo: "K-POP · 엔터테인먼트",
    industryEn: "K-POP · Entertainment",
    bodyKo:
      "지하철 랩핑 광고를 처음 해봤는데, 싱커드가 역사별 유동인구 데이터와 실제 시인성까지 꼼꼼하게 분석해줘서 7개 역사를 최적으로 선정할 수 있었습니다.",
    bodyEn:
      "First time trying subway wrap ads. THINKAD meticulously analyzed foot traffic and visibility per station, helping us optimally select 7 stations.",
    metricKo: "앨범 초동 +200%",
    metricEn: "First-week sales +200%",
    rating: 5,
    initials: "이하",
    avatarGradient: "from-purple-400 to-pink-400",
    avatarUrl: null,
    logoUrl: null,
    caseHref: null,
  },
  {
    id: "fashion-d",
    nameKo: "최윤아 브랜드 매니저",
    nameEn: "Yuna Choi, Brand Manager",
    roleKo: "브랜드 매니저",
    roleEn: "Brand Manager",
    companyKo: "패션 디자이너 브랜드 D사",
    companyEn: "Fashion Designer Brand D",
    industryKo: "패션 · 라이프스타일",
    industryEn: "Fashion · Lifestyle",
    bodyKo:
      "성수·한남 일대 감도 높은 매체를 직접 큐레이션해주셔서 브랜드 톤에 딱 맞는 OOH 캠페인을 만들 수 있었어요. 현장 검증 리포트가 결정에 큰 도움이 됐습니다.",
    bodyEn:
      "They hand-curated high-taste media around Seongsu and Hannam. The on-site verification reports were a game changer in aligning OOH with our brand tone.",
    metricKo: "팝업 방문 +180%",
    metricEn: "Pop-up visits +180%",
    rating: 5,
    initials: "최윤",
    avatarGradient: "from-amber-400 to-rose-400",
    avatarUrl: null,
    logoUrl: null,
    caseHref: null,
  },
  {
    id: "food-e",
    nameKo: "정민호 마케팅 팀장",
    nameEn: "Minho Jung, Marketing Team Lead",
    roleKo: "마케팅 팀장",
    roleEn: "Marketing Team Lead",
    companyKo: "프랜차이즈 F&B E사",
    companyEn: "F&B Franchise E",
    industryKo: "외식 · 프랜차이즈",
    industryEn: "F&B · Franchise",
    bodyKo:
      "전국 단위 OOH 론칭이라 걱정이 많았는데, 싱커드가 지역별 유동인구·타겟 데이터를 기반으로 매체 mix 와 주차별 집행 스케줄까지 짜줘서 전반적인 실행이 수월했습니다.",
    bodyEn:
      "We worried about a nationwide OOH launch, but THINKAD built a region-level media mix + weekly execution schedule based on foot traffic and target data, making rollout seamless.",
    metricKo: "전국 24개 지점 매출 +32%",
    metricEn: "+32% revenue across 24 stores",
    rating: 5,
    initials: "정민",
    avatarGradient: "from-emerald-400 to-teal-400",
    avatarUrl: null,
    logoUrl: null,
    caseHref: null,
  },
];
