export type CaseStudyCategory = "billboard" | "digital" | "transport" | "special";

/** 업종/버티컬 (리스트·필터용) */
export type CaseStudyVertical =
  | "fashion_beauty"
  | "automotive"
  | "fb"
  | "tech"
  | "entertainment"
  | "finance";

export type CaseStudyRegionKey = "seoul" | "busan" | "jeju" | "national" | "multi";

export type CaseStudyScale = "large" | "medium" | "small";

export type CaseGalleryItem = {
  type: "image" | "video";
  labelKo: string;
  labelEn: string;
};

export type CaseStudy = {
  id: number;
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  category: CaseStudyCategory;
  client: string;
  clientEn: string;
  clientLogo: string;
  roi: string;
  roiDetail: string;
  roiDetailEn: string;
  managerComment: string;
  managerCommentEn: string;
  managerName: string;
  managerNameEn: string;
  managerRole: string;
  managerRoleEn: string;
  results: string;
  resultsEn: string;
  exposures: string;
  exposuresEn: string;
  reachIncrease: string;
  campaignGoal: string;
  campaignGoalEn: string;
  mediaUsed: readonly string[];
  mediaUsedEn: readonly string[];
  duration: string;
  durationEn: string;
  stats: readonly { label: string; labelEn: string; value: string }[];
  testimonial: string;
  testimonialEn: string;
  testimonialAuthor: string;
  testimonialAuthorEn: string;
  vertical: CaseStudyVertical;
  regionKey: CaseStudyRegionKey;
  scale: CaseStudyScale;
  gallery: readonly CaseGalleryItem[];
};

export const caseStudies: readonly CaseStudy[] = [
  {
    id: 1,
    slug: "global-beauty-gangnam",
    title: "글로벌 뷰티 브랜드 강남 캠페인",
    titleEn: "Global Beauty Brand Gangnam Campaign",
    description:
      "강남역 일대 빌보드 10면을 활용한 동시 노출 캠페인으로 브랜드 인지도 300% 상승을 달성했습니다.",
    descriptionEn:
      "Achieved 300% brand awareness increase through simultaneous exposure campaign using 10 billboards around Gangnam Station.",
    category: "billboard",
    client: "글로벌 뷰티 그룹",
    clientEn: "Global beauty group",
    clientLogo: "글로",
    roi: "4.5x",
    roiDetail: "광고비 대비 4.5배 매출 효과",
    roiDetailEn: "4.5x return on ad spend",
    managerComment:
      "강남 핵심 상권에서 면수와 노출 타이밍을 검증 데이터에 맞춰 집행해 프리미엄 포지셔닝과 인지도 상승을 동시에 끌어냈습니다.",
    managerCommentEn:
      "We aligned panel count and flight timing to verified Gangnam traffic data, lifting both premium perception and awareness.",
    managerName: "이정민",
    managerNameEn: "Jungmin Lee",
    managerRole: "수석 컨설턴트",
    managerRoleEn: "Senior Consultant",
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
    vertical: "fashion_beauty",
    regionKey: "seoul",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "강남역 일대 패널 현장",
        labelEn: "Panels around Gangnam Station",
      },
      {
        type: "video",
        labelKo: "캠페인 하이라이트 20초",
        labelEn: "Campaign highlight 20s",
      },
    ],
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
    category: "digital",
    client: "AI 스타트업",
    clientEn: "AI startup",
    clientLogo: "AI",
    roi: "3.8x",
    roiDetail: "광고비 대비 3.8배 매출 효과",
    roiDetailEn: "3.8x return on ad spend",
    managerComment:
      "런칭 직후 관심이 몰리는 코엑스 접점에 집중해 B2B·B2C 타겟을 한 번에 잡은 것이 높은 효율로 이어졌습니다.",
    managerCommentEn:
      "Focusing on high-intent COEX touchpoints right after launch captured B2B and B2C audiences efficiently.",
    managerName: "김태호",
    managerNameEn: "Taeho Kim",
    managerRole: "캠페인 매니저",
    managerRoleEn: "Campaign Manager",
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
    vertical: "tech",
    regionKey: "seoul",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "코엑스 디지털 미디어",
        labelEn: "COEX digital media",
      },
      {
        type: "video",
        labelKo: "런칭 스팟 15초",
        labelEn: "Launch spot 15s",
      },
    ],
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
    category: "transport",
    client: "대형 엔터테인먼트사",
    clientEn: "Major entertainment company",
    clientLogo: "대형",
    roi: "5.2x",
    roiDetail: "광고비 대비 5.2배 매출 효과",
    roiDetailEn: "5.2x return on ad spend",
    managerComment:
      "역별 유동 패턴으로 랩핑 역을 선별해 팬 이동 동선과 맞췄고, 초동 판매와 화제성이 함께 올랐습니다.",
    managerCommentEn:
      "Station picks followed foot-traffic patterns and fan flows, lifting both first-week sales and buzz.",
    managerName: "박소영",
    managerNameEn: "Soyoung Park",
    managerRole: "미디어 플래너",
    managerRoleEn: "Media Planner",
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
    vertical: "entertainment",
    regionKey: "multi",
    scale: "large",
    gallery: [
      {
        type: "image",
        labelKo: "역사 랩핑 클로즈업",
        labelEn: "Station wrap close-up",
      },
      {
        type: "video",
        labelKo: "뮤직비디오 연동 크리에이티브",
        labelEn: "Creative synced with MV",
      },
      {
        type: "image",
        labelKo: "7개 역 동시 노출 맵",
        labelEn: "Map of 7 station placements",
      },
    ],
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
    category: "transport",
    client: "국내 식음료 대기업",
    clientEn: "Domestic F&B conglomerate",
    clientLogo: "국내",
    roi: "3.2x",
    roiDetail: "광고비 대비 3.2배 매출 효과",
    roiDetailEn: "3.2x return on ad spend",
    managerComment:
      "도시·노선별 익스포저를 균형 있게 설계해 런칭 메시지가 전국에 동시에 퍼지며 매출 성장으로 연결됐습니다.",
    managerCommentEn:
      "Balanced city and route exposure spread the launch message nationwide and converted to sales growth.",
    managerName: "최윤서",
    managerNameEn: "Yunseo Choi",
    managerRole: "시니어 매니저",
    managerRoleEn: "Senior Manager",
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
    vertical: "fb",
    regionKey: "national",
    scale: "large",
    gallery: [
      {
        type: "image",
        labelKo: "시내버스 랩 디자인",
        labelEn: "City bus wrap design",
      },
      {
        type: "video",
        labelKo: "전국 런칭 티저",
        labelEn: "National launch teaser",
      },
    ],
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
    category: "digital",
    client: "대형 증권사",
    clientEn: "Major securities firm",
    clientLogo: "대형",
    roi: "4.0x",
    roiDetail: "광고비 대비 4.0배 매출 효과",
    roiDetailEn: "4.0x return on ad spend",
    managerComment:
      "출퇴근·미팅 동선에 맞춘 디지털 OOH 배치로 투자자 리드의 질과 전환 가능성이 크게 개선됐습니다.",
    managerCommentEn:
      "OOH mapped to commute and meeting flows in Yeouido materially improved lead quality from investors.",
    managerName: "한지우",
    managerNameEn: "Jiwoo Han",
    managerRole: "디지털 전략팀장",
    managerRoleEn: "Digital Strategy Lead",
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
    vertical: "finance",
    regionKey: "seoul",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "여의도 금융가 디지털 패널",
        labelEn: "Yeouido financial district panels",
      },
      {
        type: "video",
        labelKo: "브랜드 필름 30초",
        labelEn: "Brand film 30s",
      },
    ],
  },
  {
    id: 6,
    slug: "beauty-myeongdong-led",
    title: "뷰티 브랜드 명동 전광판",
    titleEn: "Beauty Brand Myeongdong LED",
    description:
      "명동 중심가 대형 전광판을 활용한 캠페인으로 명동 상권 내 방문객 유입 180% 증가를 달성했습니다.",
    descriptionEn:
      "Achieved 180% increase in visitors to the Myeongdong district through a campaign using the central Myeongdong LED.",
    category: "digital",
    client: "K-뷰티 브랜드",
    clientEn: "K-beauty brand",
    clientLogo: "K-",
    roi: "3.5x",
    roiDetail: "광고비 대비 3.5배 매출 효과",
    roiDetailEn: "3.5x return on ad spend",
    managerComment:
      "명동 중심 LED와 방문객 유동·체류 패턴 데이터를 결합해 상권 유입을 정확히 겨냥했습니다.",
    managerCommentEn:
      "Pairing the Myeongdong LED with visitor flow and dwell-time data precisely targeted store traffic.",
    managerName: "정다은",
    managerNameEn: "Daeun Jung",
    managerRole: "캠페인 매니저",
    managerRoleEn: "Campaign Manager",
    results: "관광객 유입 180% 증가",
    resultsEn: "180% increase in district visitors",
    exposures: "520만",
    exposuresEn: "5.2M",
    reachIncrease: "+180%",
    campaignGoal: "명동 상권 방문객 대상 브랜드 인지도 및 매장·온라인 유입",
    campaignGoalEn:
      "Grow awareness and drive store and online traffic among visitors to the Myeongdong district",
    mediaUsed: ["대형 LED 전광판", "명동 중심가"],
    mediaUsedEn: ["Large-format LED", "Myeongdong core district"],
    duration: "6주",
    durationEn: "6 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "520만" },
      { label: "도달 증가", labelEn: "Reach uplift", value: "+180%" },
      { label: "방문객 유입", labelEn: "Visitor traffic", value: "+180%" },
      { label: "핵심 상권", labelEn: "Key district", value: "명동 중심가" },
    ],
    testimonial:
      "명동 상권 유동 데이터 분석이 탁월했습니다. 방문객 유입과 매출 모두 기대 이상으로 성장했습니다.",
    testimonialEn:
      "The analysis of visitor flows in the Myeongdong district was outstanding. Both traffic and sales grew beyond expectations.",
    testimonialAuthor: "한소희 마케팅본부장",
    testimonialAuthorEn: "Sohee Han, Head of Marketing",
    vertical: "fashion_beauty",
    regionKey: "seoul",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "명동 대형 LED 야간",
        labelEn: "Myeongdong large LED at night",
      },
      {
        type: "image",
        labelKo: "상권 유입 히트맵 리포트",
        labelEn: "District traffic heatmap excerpt",
      },
      {
        type: "video",
        labelKo: "스킨케어 런칭 모션",
        labelEn: "Skincare launch motion",
      },
    ],
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
    category: "billboard",
    client: "모바일 플랫폼",
    clientEn: "Mobile platform",
    clientLogo: "모바",
    roi: "4.8x",
    roiDetail: "광고비 대비 4.8배 매출 효과",
    roiDetailEn: "4.8x return on ad spend",
    managerComment:
      "피크 시즌 관람·체류 데이터를 반영해 앱 설치 전환에 유리한 시간대에 노출을 집중했습니다.",
    managerCommentEn:
      "Peak-season dwell data let us weight exposures toward dayparts that favored app installs.",
    managerName: "김서준",
    managerNameEn: "Seojun Kim",
    managerRole: "그로스 컨설턴트",
    managerRoleEn: "Growth Consultant",
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
    vertical: "tech",
    regionKey: "busan",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "해운대 해변 빌보드",
        labelEn: "Haeundae beach billboard",
      },
      {
        type: "video",
        labelKo: "시즌 캠페인 클립",
        labelEn: "Season campaign clip",
      },
    ],
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
    category: "special",
    client: "공연 기획사",
    clientEn: "Concert production company",
    clientLogo: "공연",
    roi: "6.0x",
    roiDetail: "광고비 대비 6.0배 매출 효과",
    roiDetailEn: "6.0x return on ad spend",
    managerComment:
      "공항 입국부터 관광단지 이동까지 터치포인트를 연결해 티켓 구매 의도를 끝까지 밀어 완판으로 이었습니다.",
    managerCommentEn:
      "Linking airport arrivals to resort touchpoints sustained intent through to a sold-out outcome.",
    managerName: "이수빈",
    managerNameEn: "Subin Lee",
    managerRole: "스페셜 캠페인 PD",
    managerRoleEn: "Special Campaign PD",
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
    vertical: "entertainment",
    regionKey: "jeju",
    scale: "medium",
    gallery: [
      {
        type: "image",
        labelKo: "제주공항 디지털 미디어",
        labelEn: "Jeju airport digital media",
      },
      {
        type: "video",
        labelKo: "콘서트 티저 영상",
        labelEn: "Concert teaser video",
      },
      {
        type: "image",
        labelKo: "관광단지 패널",
        labelEn: "Resort district panels",
      },
    ],
  },
  {
    id: 9,
    slug: "premium-ev-gangnam-launch",
    title: "프리미엄 EV 브랜드 강남 런칭",
    titleEn: "Premium EV Brand Gangnam Launch",
    description:
      "강남 핵심 상권 디지털 OOH와 랜드마크 패널을 결합한 런칭 캠페인으로 시승 예약 220% 증가를 달성했습니다.",
    descriptionEn:
      "Combined Gangnam digital OOH and landmark panels for launch, driving 220% more test-drive bookings.",
    category: "digital",
    client: "글로벌 프리미엄 자동차 브랜드",
    clientEn: "Global premium automotive brand",
    clientLogo: "EV",
    roi: "4.2x",
    roiDetail: "광고비 대비 4.2배 리드 효율",
    roiDetailEn: "4.2x efficiency on lead generation spend",
    managerComment:
      "전기차 관심층 동선과 강남 프리미엄 상권을 겹쳐 시승·리드로 연결되는 터치포인트를 설계했습니다.",
    managerCommentEn:
      "We overlapped EV-intent journeys with Gangnam premium traffic to drive test-drive leads.",
    managerName: "윤도현",
    managerNameEn: "Dohyun Yoon",
    managerRole: "오토모티브 리드",
    managerRoleEn: "Automotive Lead",
    results: "시승 예약 220% 증가",
    resultsEn: "220% increase in test-drive bookings",
    exposures: "380만",
    exposuresEn: "3.8M",
    reachIncrease: "+210%",
    campaignGoal: "런칭 구간 프리미엄 이미지 확립 및 시승 리드 확보",
    campaignGoalEn:
      "Establish premium launch perception and capture test-drive leads",
    mediaUsed: ["강남 디지털 OOH", "랜드마크 패널", "프리미엄 상권 패키지"],
    mediaUsedEn: ["Gangnam digital OOH", "Landmark panels", "Premium district package"],
    duration: "7주",
    durationEn: "7 weeks",
    stats: [
      { label: "총 노출", labelEn: "Total exposures", value: "380만" },
      { label: "시승 예약", labelEn: "Test drives", value: "+220%" },
      { label: "집행 기간", labelEn: "Duration", value: "7주" },
      { label: "핵심 상권", labelEn: "Core area", value: "강남·신사" },
    ],
    testimonial:
      "브랜드 톤에 맞는 매체 큐레이션이 인상적이었고, 시승 전환까지 이어진 데이터 리포트가 매우 유용했습니다.",
    testimonialEn:
      "Media curation matched our brand tone perfectly, and the reporting through to test-drive conversion was invaluable.",
    testimonialAuthor: "장민호 브랜드 디렉터",
    testimonialAuthorEn: "Minho Jang, Brand Director",
    vertical: "automotive",
    regionKey: "seoul",
    scale: "large",
    gallery: [
      {
        type: "image",
        labelKo: "강남 EV 런칭 패널",
        labelEn: "Gangnam EV launch panel",
      },
      {
        type: "video",
        labelKo: "프리미엄 런칭 필름 45초",
        labelEn: "Premium launch film 45s",
      },
      {
        type: "image",
        labelKo: "시승 부스 연계 OOH",
        labelEn: "OOH linked to test-drive booth",
      },
    ],
  },
];

export const categoryColors: Record<CaseStudyCategory, string> = {
  billboard: "bg-blue-50 text-blue-700",
  digital: "bg-purple-50 text-purple-700",
  transport: "bg-orange-50 text-orange-700",
  special: "bg-emerald-50 text-emerald-700",
};

export const verticalColors: Record<CaseStudyVertical, string> = {
  fashion_beauty: "border border-pink-200/80 bg-pink-50 text-pink-900",
  automotive: "border border-slate-200 bg-slate-100 text-slate-800",
  fb: "border border-amber-200/80 bg-amber-50 text-amber-950",
  tech: "border border-cyan-200/80 bg-cyan-50 text-cyan-900",
  entertainment: "border border-violet-200/80 bg-violet-50 text-violet-900",
  finance: "border border-emerald-200/80 bg-emerald-50 text-emerald-900",
};

const OTHER_VERTICALS: readonly CaseStudyVertical[] = [
  "tech",
  "entertainment",
  "finance",
];

export function caseMatchesVerticalTab(
  vertical: CaseStudyVertical,
  tab: "all" | CaseStudyVertical | "other"
): boolean {
  if (tab === "all") return true;
  if (tab === "other") return OTHER_VERTICALS.includes(vertical);
  return vertical === tab;
}

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((c) => c.slug === slug);
}
