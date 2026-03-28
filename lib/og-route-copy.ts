export type OgBlock = { badge: string; title: string; subtitle: string };

const routes = {
  home: {
    ko: {
      badge: "Korea's #1 OOH Ad Agency",
      title: "생각하는 광고회사, 싱커드",
      subtitle: "전국 500+ 검증된 옥외광고 매체 · 데이터 기반 캠페인 컨설팅",
    },
    en: {
      badge: "Korea's #1 OOH Ad Agency",
      title: "The Thinking Ad Agency",
      subtitle: "500+ verified OOH media nationwide · Data-driven campaign consulting",
    },
  },
  about: {
    ko: {
      badge: "About THINKAD",
      title: "생각하는 광고회사, 싱커드",
      subtitle: "2016년 설립 · 15년 이상 OOH 업력 · 100+ 대기업 파트너",
    },
    en: {
      badge: "About THINKAD",
      title: "THINKAD — Korea's OOH agency",
      subtitle: "Founded 2016 · 15+ years in OOH · 100+ enterprise partners",
    },
  },
  contact: {
    ko: {
      badge: "Contact Us",
      title: "무료 OOH 광고 상담",
      subtitle: "30초 만에 신청 · 24시간 내 전문 컨설턴트 연락",
    },
    en: {
      badge: "Contact Us",
      title: "Free OOH consultation",
      subtitle: "Apply in 30 seconds · Expert reply within 24 hours",
    },
  },
  media: {
    ko: {
      badge: "Verified Media",
      title: "옥외광고 매체 검색",
      subtitle: "전국 500+ 검증된 빌보드·디지털·교통 매체를 한눈에 비교",
    },
    en: {
      badge: "Verified Media",
      title: "OOH media search",
      subtitle: "Compare 500+ verified billboards, DOOH, and transit media",
    },
  },
  recommend: {
    ko: {
      badge: "AI",
      title: "싱커드 AI 매체 추천",
      subtitle: "목표·예산·지역 입력 → 최적 매체 · 리스트·지도 · 장바구니 견적",
    },
    en: {
      badge: "AI",
      title: "AI OOH media picks",
      subtitle: "Goals, budget, region → ranked media · list & map · cart to quote",
    },
  },
  casesList: {
    ko: {
      badge: "Case Studies",
      title: "OOH 광고 성공 사례",
      subtitle: "데이터로 검증된 캠페인 성과와 ROI 인사이트",
    },
    en: {
      badge: "Case Studies",
      title: "OOH success stories",
      subtitle: "Campaign results and ROI backed by data",
    },
  },
  faq: {
    ko: {
      badge: "FAQ",
      title: "OOH 광고 자주 묻는 질문",
      subtitle: "진행 절차, 비용, 매체 선정 — 싱커드 답변 모음",
    },
    en: {
      badge: "FAQ",
      title: "OOH advertising FAQ",
      subtitle: "Process, budgets, media selection — answers from THINKAD",
    },
  },
  academy: {
    ko: {
      badge: "Academy",
      title: "OOH 아카데미 & 웨비나",
      subtitle: "기초 강의 · 전략 웨비나 · PDF·영상 자료",
    },
    en: {
      badge: "Academy",
      title: "OOH Academy & webinars",
      subtitle: "Fundamentals · strategy webinars · PDFs & video",
    },
  },
  insights: {
    ko: {
      badge: "Insights",
      title: "OOH 트렌드 인사이트",
      subtitle: "월간·분기 시장 리포트 · DOOH 동향",
    },
    en: {
      badge: "Insights",
      title: "OOH trend insights",
      subtitle: "Monthly & quarterly market reports · DOOH outlook",
    },
  },
  resources: {
    ko: {
      badge: "Resources",
      title: "OOH 리소스 & 인사이트",
      subtitle: "가이드 · 리포트 · 데이터 기반 전략 자료",
    },
    en: {
      badge: "Resources",
      title: "OOH resources",
      subtitle: "Guides, reports, and data-backed playbooks",
    },
  },
  tools: {
    ko: {
      badge: "Tools",
      title: "OOH 광고 도구",
      subtitle: "ROI 시뮬레이션 · 매체 효과 분석",
    },
    en: {
      badge: "Tools",
      title: "OOH planning tools",
      subtitle: "ROI simulation · media performance helpers",
    },
  },
  blog: {
    ko: {
      badge: "Blog",
      title: "OOH 광고 블로그",
      subtitle: "트렌드 · 사례 분석 · 미디어 전략",
    },
    en: {
      badge: "Blog",
      title: "OOH advertising blog",
      subtitle: "Trends, case breakdowns, media strategy",
    },
  },
  news: {
    ko: {
      badge: "News",
      title: "싱커드 뉴스",
      subtitle: "캠페인 소식 · 업계 업데이트",
    },
    en: {
      badge: "News",
      title: "THINKAD news",
      subtitle: "Campaign updates and industry news",
    },
  },
  compare: {
    ko: {
      badge: "Compare",
      title: "OOH 매체 비교",
      subtitle: "조건에 맞는 매체를 나란히 비교",
    },
    en: {
      badge: "Compare",
      title: "Compare OOH media",
      subtitle: "Side-by-side options for your brief",
    },
  },
  history: {
    ko: {
      badge: "History",
      title: "싱커드 연혁",
      subtitle: "2016년부터 이어온 OOH 여정",
    },
    en: {
      badge: "History",
      title: "THINKAD timeline",
      subtitle: "Our OOH journey since 2016",
    },
  },
  portfolio: {
    ko: {
      badge: "Portfolio",
      title: "포트폴리오",
      subtitle: "대표 캠페인 & 크리에이티브 하이라이트",
    },
    en: {
      badge: "Portfolio",
      title: "Campaign portfolio",
      subtitle: "Highlights and creative showcase",
    },
  },
  planner: {
    ko: {
      badge: "Planner",
      title: "OOH 미디어 플래너",
      subtitle: "예산·지역·기간으로 노출·ROI 시뮬레이션",
    },
    en: {
      badge: "Planner",
      title: "OOH media planner",
      subtitle: "Simulate reach and ROI by budget, region, and duration",
    },
  },
  quote: {
    ko: {
      badge: "Quote",
      title: "OOH 견적 요청",
      subtitle: "맞춤 견적을 빠르게 받아보세요",
    },
    en: {
      badge: "Quote",
      title: "Request an OOH quote",
      subtitle: "Get a tailored estimate quickly",
    },
  },
} as const;

export type OgRouteId = keyof typeof routes;

export function ogForRoute(route: OgRouteId, locale: string): OgBlock {
  const b = routes[route];
  return locale === "ko" ? b.ko : b.en;
}

/** Short bilingual strings for metadata `openGraph.images[].alt`. */
export function ogAltForRoute(route: OgRouteId): { ko: string; en: string } {
  const r = routes[route];
  return {
    ko: `${r.ko.title} — ${r.ko.subtitle}`,
    en: `${r.en.title} — ${r.en.subtitle}`,
  };
}
