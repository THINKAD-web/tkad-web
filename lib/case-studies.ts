export const caseStudies = [
  {
    id: 1,
    slug: "global-beauty-gangnam",
    title: "글로벌 뷰티 브랜드 강남 캠페인",
    titleEn: "Global Beauty Brand Gangnam Campaign",
    description:
      "강남역 일대 빌보드 10면을 활용한 동시 노출 캠페인으로 브랜드 인지도 300% 상승을 달성했습니다.",
    descriptionEn:
      "Achieved 300% brand awareness increase through simultaneous exposure campaign using 10 billboards around Gangnam Station.",
    category: "billboard" as const,
    client: "글로벌 뷰티 그룹",
    clientEn: "Global beauty group",
    results: "브랜드 인지도 300% 상승",
    resultsEn: "300% brand awareness increase",
    exposures: "450만",
    exposuresEn: "4.5M",
    reachIncrease: "+300%",
    campaignGoal: "강남 핵심 상권에서 브랜드 인지도 및 프리미엄 이미지 강화",
    campaignGoalEn:
      "Strengthen brand awareness and premium positioning in Gangnam’s core commercial zone",
    mediaUsed: ["빌보드", "대형 OOH"],
    mediaUsedEn: ["Billboards", "Large-format OOH"],
    duration: "6주",
    durationEn: "6 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "450만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+300%" },
      { label: "운영 면수", labelEn: "Panels", value: "10면" },
      { label: "핵심 지역", labelEn: "Key area", value: "강남역 일대" },
    ],
    testimonial:
      "싱커드의 검증 데이터 덕분에 확신을 갖고 캠페인을 진행할 수 있었습니다. 결과가 기대 이상이었습니다.",
    testimonialEn:
      "THINKAD's verified data gave us the confidence to run the campaign. The results exceeded our expectations.",
    testimonialAuthor: "김서연 마케팅 이사",
    testimonialAuthorEn: "Seoyeon Kim, Marketing Director",
  },
  {
    id: 2,
    slug: "tech-startup-coex-launch",
    title: "테크 스타트업 코엑스 런칭",
    titleEn: "Tech Startup COEX Launch Campaign",
    description:
      "코엑스 디지털 사이니지를 활용한 신제품 런칭 캠페인으로 2주간 150만 노출을 달성했습니다.",
    descriptionEn:
      "Achieved 1.5 million exposures in 2 weeks through new product launch campaign using COEX digital signage.",
    category: "digital" as const,
    client: "AI 스타트업",
    clientEn: "AI startup",
    results: "2주간 150만 노출",
    resultsEn: "1.5M exposures in 2 weeks",
    exposures: "150만",
    exposuresEn: "1.5M",
    reachIncrease: "+180%",
    campaignGoal: "런칭 직후 B2B·B2C 타겟에게 제품 인지도 확보",
    campaignGoalEn:
      "Build product awareness among B2B and B2C audiences immediately after launch",
    mediaUsed: ["디지털 사이니지", "코엑스 실내 미디어"],
    mediaUsedEn: ["Digital signage", "COEX indoor media"],
    duration: "2주",
    durationEn: "2 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "150만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+180%" },
      { label: "집행 기간", labelEn: "Duration", value: "14일" },
      { label: "주요 거점", labelEn: "Venue", value: "코엑스" },
    ],
    testimonial:
      "예산이 한정적이었는데 데이터 기반으로 최적의 매체를 추천받아 놀라운 ROI를 달성했습니다.",
    testimonialEn:
      "Despite a limited budget, the data-driven media recommendations delivered an amazing ROI.",
    testimonialAuthor: "박준혁 대표",
    testimonialAuthorEn: "Junhyuk Park, CEO",
  },
  {
    id: 3,
    slug: "entertainment-subway-campaign",
    title: "엔터테인먼트 지하철 광고",
    titleEn: "Entertainment Subway Campaign",
    description:
      "서울 지하철 주요 7개 역사 랩핑 광고로 앨범 초동 판매 200% 증가를 이끌었습니다.",
    descriptionEn:
      "Led to 200% increase in first-week album sales through wrapping ads at 7 major Seoul subway stations.",
    category: "transport" as const,
    client: "대형 엔터테인먼트사",
    clientEn: "Major entertainment company",
    results: "초동 판매 200% 증가",
    resultsEn: "200% increase in first-week sales",
    exposures: "680만",
    exposuresEn: "6.8M",
    reachIncrease: "+250%",
    campaignGoal: "컴백 앨범 초동 판매 및 화제성 극대화",
    campaignGoalEn:
      "Maximize first-week album sales and buzz for the comeback release",
    mediaUsed: ["지하철 역사 랩핑", "교통 광고"],
    mediaUsedEn: ["Subway station wraps", "Transit advertising"],
    duration: "4주",
    durationEn: "4 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "680만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+250%" },
      { label: "역사 수", labelEn: "Stations", value: "7개" },
      { label: "초동 성과", labelEn: "First-week result", value: "+200%" },
    ],
    testimonial:
      "역사별 유동인구 데이터 분석이 정말 정확했어요. 다음 캠페인도 싱커드와 함께합니다.",
    testimonialEn:
      "The foot traffic analysis per station was incredibly accurate. We'll definitely use THINKAD again.",
    testimonialAuthor: "이하은 팀장",
    testimonialAuthorEn: "Haeun Lee, Team Lead",
  },
  {
    id: 4,
    slug: "fnb-national-bus-campaign",
    title: "식음료 브랜드 전국 버스 캠페인",
    titleEn: "F&B Brand National Bus Campaign",
    description:
      "전국 주요 도시 시내버스 500대를 활용한 신제품 런칭 캠페인으로 매출 40% 증가를 달성했습니다.",
    descriptionEn:
      "Achieved 40% sales increase through new product launch campaign using 500 city buses across major cities.",
    category: "transport" as const,
    client: "국내 식음료 대기업",
    clientEn: "Domestic F&B conglomerate",
    results: "매출 40% 증가",
    resultsEn: "40% sales increase",
    exposures: "1,200만",
    exposuresEn: "12M",
    reachIncrease: "+320%",
    campaignGoal: "신제품 전국 동시 런칭 인지도 및 매출 성장",
    campaignGoalEn:
      "Drive nationwide awareness and sales for a simultaneous new product launch",
    mediaUsed: ["시내버스 외부 랩", "전국 노선"],
    mediaUsedEn: ["City bus exterior wraps", "National routes"],
    duration: "8주",
    durationEn: "8 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "1,200만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+320%" },
      { label: "버스 대수", labelEn: "Buses", value: "500대" },
      { label: "매출 성과", labelEn: "Sales", value: "+40%" },
    ],
    testimonial:
      "전국 단위 캠페인을 원스톱으로 관리해주셔서 내부 리소스를 크게 절약할 수 있었습니다.",
    testimonialEn:
      "Managing a national campaign in one stop saved significant internal resources for us.",
    testimonialAuthor: "최민수 브랜드 매니저",
    testimonialAuthorEn: "Minsu Choi, Brand Manager",
  },
  {
    id: 5,
    slug: "financial-yeouido-digital-ooh",
    title: "금융사 여의도 디지털 OOH",
    titleEn: "Financial Corp Yeouido Digital OOH",
    description:
      "여의도 금융 중심가 디지털 사이니지를 활용한 기업 브랜딩 캠페인으로 투자자 문의 250% 증가를 이끌었습니다.",
    descriptionEn:
      "Led to 250% increase in investor inquiries through corporate branding campaign using digital signage in Yeouido financial district.",
    category: "digital" as const,
    client: "대형 증권사",
    clientEn: "Major securities firm",
    results: "투자자 문의 250% 증가",
    resultsEn: "250% increase in investor inquiries",
    exposures: "320만",
    exposuresEn: "3.2M",
    reachIncrease: "+250%",
    campaignGoal: "금융·투자 타겟에게 브랜드 신뢰도 및 리드 확보",
    campaignGoalEn:
      "Build trust and capture leads among finance and investor audiences",
    mediaUsed: ["디지털 사이니지", "여의도 금융가"],
    mediaUsedEn: ["Digital signage", "Yeouido financial district"],
    duration: "5주",
    durationEn: "5 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "320만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+250%" },
      { label: "문의 증가", labelEn: "Inquiry uplift", value: "+250%" },
      { label: "타겟", labelEn: "Audience", value: "IB·리테일 투자자" },
    ],
    testimonial:
      "금융 타겟에 맞는 정밀한 매체 선정이 인상적이었습니다. 문의량이 극적으로 증가했습니다.",
    testimonialEn:
      "The precise media selection targeting the financial audience was impressive. Inquiries increased dramatically.",
    testimonialAuthor: "정우성 CMO",
    testimonialAuthorEn: "Wooseong Jung, CMO",
  },
  {
    id: 6,
    slug: "beauty-myeongdong-led",
    title: "뷰티 브랜드 명동 전광판",
    titleEn: "Beauty Brand Myeongdong LED",
    description:
      "명동 중심가 대형 전광판을 활용한 크로스보더 캠페인으로 해외 관광객 유입 180% 증가를 달성했습니다.",
    descriptionEn:
      "Achieved 180% increase in foreign tourist visits through cross-border campaign using Myeongdong central LED.",
    category: "digital" as const,
    client: "K-뷰티 브랜드",
    clientEn: "K-beauty brand",
    results: "관광객 유입 180% 증가",
    resultsEn: "180% increase in tourist visits",
    exposures: "520만",
    exposuresEn: "5.2M",
    reachIncrease: "+180%",
    campaignGoal: "해외 관광객 대상 브랜드 인지도 및 매장·온라인 유입",
    campaignGoalEn:
      "Grow awareness and drive store and online traffic among international visitors",
    mediaUsed: ["대형 LED 전광판", "명동 중심가"],
    mediaUsedEn: ["Large-format LED", "Myeongdong core district"],
    duration: "6주",
    durationEn: "6 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "520만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+180%" },
      { label: "관광객 유입", labelEn: "Tourist traffic", value: "+180%" },
      { label: "크로스보더", labelEn: "Cross-border", value: "다국어 크리에이티브" },
    ],
    testimonial:
      "해외 관광객 타겟팅에 대한 데이터 분석이 탁월했습니다. 크로스보더 캠페인의 새로운 기준을 제시했어요.",
    testimonialEn:
      "Exceptional data analysis for foreign tourist targeting. It set a new standard for cross-border campaigns.",
    testimonialAuthor: "한소희 해외사업부장",
    testimonialAuthorEn: "Sohee Han, International Division Head",
  },
  {
    id: 7,
    slug: "tech-haeundae-billboard",
    title: "테크 기업 해운대 빌보드",
    titleEn: "Tech Company Haeundae Billboard",
    description:
      "해운대 해변 빌보드를 활용한 여름 시즌 캠페인으로 앱 다운로드 120% 증가를 이끌었습니다.",
    descriptionEn:
      "Led to 120% increase in app downloads through summer season campaign using Haeundae beach billboard.",
    category: "billboard" as const,
    client: "모바일 플랫폼",
    clientEn: "Mobile platform",
    results: "앱 다운로드 120% 증가",
    resultsEn: "120% increase in app downloads",
    exposures: "280만",
    exposuresEn: "2.8M",
    reachIncrease: "+120%",
    campaignGoal: "여름 시즌 앱 설치 및 신규 유저 확보",
    campaignGoalEn:
      "Acquire app installs and new users during the summer peak season",
    mediaUsed: ["해변 빌보드", "관광 특화 OOH"],
    mediaUsedEn: ["Beach billboard", "Tourism-focused OOH"],
    duration: "5주",
    durationEn: "5 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "280만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+120%" },
      { label: "앱 설치", labelEn: "App installs", value: "+120%" },
      { label: "시즌", labelEn: "Season", value: "여름 피크" },
    ],
    testimonial:
      "시즌 특성에 맞는 매체 전략 제안이 정확했습니다. 여름 시즌 KPI를 초과 달성했어요.",
    testimonialEn:
      "The seasonal media strategy was spot-on. We exceeded our summer season KPI targets.",
    testimonialAuthor: "강지호 그로스팀장",
    testimonialAuthorEn: "Jiho Kang, Growth Team Lead",
  },
  {
    id: 8,
    slug: "entertainment-jeju-tourism",
    title: "엔터 기업 제주 관광 캠페인",
    titleEn: "Entertainment Jeju Tourism Campaign",
    description:
      "제주공항 및 관광단지 디지털 광고를 통한 콘서트 홍보 캠페인으로 티켓 판매 완판을 달성했습니다.",
    descriptionEn:
      "Achieved sold-out ticket sales through concert promotion campaign via Jeju airport and resort digital ads.",
    category: "special" as const,
    client: "공연 기획사",
    clientEn: "Concert production company",
    results: "티켓 전석 완판",
    resultsEn: "Sold-out tickets",
    exposures: "190만",
    exposuresEn: "1.9M",
    reachIncrease: "+200%",
    campaignGoal: "제주 입도 관광객 대상 콘서트 티켓 판매 극대화",
    campaignGoalEn:
      "Maximize concert ticket sales among visitors arriving on Jeju",
    mediaUsed: ["공항 디지털 미디어", "관광단지 디지털 OOH"],
    mediaUsedEn: ["Airport digital media", "Resort digital OOH"],
    duration: "3주",
    durationEn: "3 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "190만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+200%" },
      { label: "티켓", labelEn: "Tickets", value: "완판" },
      { label: "거점", labelEn: "Touchpoints", value: "공항·관광단지" },
    ],
    testimonial:
      "공항과 관광단지를 연결한 캠페인 설계가 완벽했습니다. 완판이라는 최고의 결과를 만들어줬어요.",
    testimonialEn:
      "The campaign design connecting the airport and tourist areas was perfect. It delivered the ultimate result: sold out.",
    testimonialAuthor: "오지영 프로듀서",
    testimonialAuthorEn: "Jiyoung Oh, Producer",
  },
] as const;

export type CaseStudy = typeof caseStudies[number];

export const categoryColors: Record<CaseStudy["category"], string> = {
  billboard: "bg-blue-50 text-blue-700",
  digital: "bg-purple-50 text-purple-700",
  transport: "bg-orange-50 text-orange-700",
  special: "bg-emerald-50 text-emerald-700",
};

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
