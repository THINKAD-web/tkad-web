export type BlogSection =
  | { type: "h2"; textKo: string; textEn: string }
  | { type: "p"; textKo: string; textEn: string }
  | { type: "ul"; itemsKo: string[]; itemsEn: string[] };

export type BlogSeoPost = {
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  keywordsKo: string[];
  keywordsEn: string[];
  relatedLocal?: { region: string; district: string }[];
  relatedTypes?: ("billboard" | "subway" | "dooh")[];
  relatedMediaIds?: string[];
  sections: BlogSection[];
  faqsKo: { q: string; a: string }[];
  faqsEn: { q: string; a: string }[];
};

export const BLOG_SEO_POSTS: BlogSeoPost[] = [
  {
    slug: "gangnam-led-ad-cost-2026",
    publishedAt: "2026-05-01",
    titleKo: "강남 전광판 광고비 얼마? 2026년 최신 단가표",
    titleEn: "Gangnam LED billboard costs — 2026 pricing guide",
    descriptionKo:
      "강남·신논현·테헤란로 전광판 월 광고비 범위, 견적 산정 방식, 예산별 추천 매체를 THINKAD 데이터 기준으로 정리했습니다.",
    descriptionEn:
      "2026 guide to Gangnam LED and DOOH pricing, quoting methods, and budget tiers on THINKAD.",
    keywordsKo: [
      "강남 전광판 광고비",
      "강남 옥외광고",
      "전광판 단가",
      "OOH 견적",
    ],
    keywordsEn: ["Gangnam LED cost", "OOH pricing Korea", "DOOH quote"],
    relatedLocal: [{ region: "seoul", district: "gangnam" }],
    relatedTypes: ["dooh"],
    sections: [
      {
        type: "p",
        textKo:
          "강남 전광판 광고비는 위치·규격·집행 기간·시간대에 따라 크게 달라집니다. 2026년 기준 THINKAD 검증 매체 데이터를 바탕으로 대표적인 가격대와 견적 시 확인할 항목을 정리합니다.",
        textEn:
          "Gangnam LED pricing varies by location, size, flight length, and dayparts. Here is a practical 2026 range based on THINKAD verified inventory.",
      },
      {
        type: "h2",
        textKo: "대표 가격대 (월 기준, VAT 별도)",
        textEn: "Typical monthly ranges (excl. VAT)",
      },
      {
        type: "ul",
        itemsKo: [
          "소형 디지털 패널·역사 인근: 약 500만~1,500만원",
          "강남대로·테헤란로 미디어월: 약 2,000만~5,000만원",
          "랜드마크 대형 LED: 5,000만원 이상 (슬롯·기간 협의)",
        ],
        itemsEn: [
          "Small digital panels: ~₩5–15M/month",
          "Teheran-ro media walls: ~₩20–50M/month",
          "Landmark LED: ₩50M+ depending on slots",
        ],
      },
      {
        type: "h2",
        textKo: "견적에 포함되는 항목",
        textEn: "What quotes include",
      },
      {
        type: "p",
        textKo:
          "매체 사용료 외에 소재 제작·감수·설치 조정비가 별도일 수 있습니다. THINKAD 견적서에서는 매체별 라인 아이템과 VAT 10%를 분리해 확인할 수 있습니다.",
        textEn:
          "Quotes may separate media fees from creative production and install adjustments. THINKAD itemizes VAT at 10%.",
      },
    ],
    faqsKo: [
      {
        q: "최소 집행 기간은?",
        a: "매체마다 2주~1개월이 일반적입니다. 상세 페이지에서 기간별 계산기를 사용하세요.",
      },
    ],
    faqsEn: [],
  },
  {
    slug: "hongdae-ooh-guide",
    publishedAt: "2026-05-03",
    titleKo: "홍대 옥외광고 완벽 가이드 — 매체 유형별 비교",
    titleEn: "Hongdae OOH guide — format comparison",
    descriptionKo:
      "홍대·합정·상암 DMC에서 빌보드·전광판·교통 매체를 비교하고, 업종별 추천 조합을 소개합니다.",
    descriptionEn: "Compare billboard, DOOH, and transit formats around Hongdae.",
    keywordsKo: ["홍대 옥외광고", "홍대 전광판", "마포 OOH"],
    keywordsEn: ["Hongdae OOH", "Hongdae billboard"],
    relatedLocal: [{ region: "seoul", district: "hongdae" }],
    relatedTypes: ["dooh", "billboard", "subway"],
    sections: [
      {
        type: "p",
        textKo:
          "홍대 상권은 MZ·문화 브랜드 캠페인이 많아 DOOH·팝업 연계 집행이 활발합니다. 유형별 장단점을 비교해 예산에 맞는 조합을 선택하세요.",
        textEn:
          "Hongdae favors youth and culture campaigns — often pairing DOOH with pop-up activations.",
      },
      {
        type: "h2",
        textKo: "유형별 추천",
        textEn: "Format picks",
      },
      {
        type: "ul",
        itemsKo: [
          "DOOH: 론칭·프로모션, 영상 메시지",
          "교통: 지하철 2·6호선 대량 도달",
          "빌보드: 브랜드 상시 노출",
        ],
        itemsEn: [
          "DOOH: launches & promos",
          "Transit: Line 2/6 reach",
          "Billboard: always-on branding",
        ],
      },
    ],
    faqsKo: [],
    faqsEn: [],
  },
  {
    slug: "subway-ad-effectiveness",
    publishedAt: "2026-05-05",
    titleKo: "지하철 광고 효과 있나요? 실제 집행 사례로 알아보기",
    titleEn: "Does subway advertising work? Case-based look",
    descriptionKo:
      "지하철·교통 OOH의 강점, KPI 설정, THINKAD 성공 사례에서 확인한 인사이트를 정리합니다.",
    descriptionEn: "Subway OOH strengths, KPIs, and lessons from THINKAD cases.",
    keywordsKo: ["지하철 광고", "교통 광고 효과", "OOH 사례"],
    keywordsEn: ["subway advertising Korea", "transit OOH"],
    relatedTypes: ["subway"],
    sections: [
      {
        type: "p",
        textKo:
          "지하철 광고는 짧은 시청 시간이지만 높은 프리퀀시와 출퇴근 타깃팅이 강점입니다. 앱·F&B·이벤트 캠페인에서 검증된 사례가 많습니다.",
        textEn:
          "Subway OOH wins on frequency and commuter targeting despite short dwell time.",
      },
    ],
    faqsKo: [
      {
        q: "어떤 KPI가 적합한가요?",
        a: "도달·프리퀀시·QR/앱 설치 전환 등 캠페인 목적에 맞게 설정하세요.",
      },
    ],
    faqsEn: [],
  },
  {
    slug: "ooh-cpm-guide",
    publishedAt: "2026-05-07",
    titleKo: "OOH 광고 CPM 계산법 — 예산 대비 최적 매체 고르는 법",
    titleEn: "OOH CPM guide — pick efficient inventory",
    descriptionKo:
      "CPM 계산식, 노출 추정치 해석, THINKAD 비교 도구로 예산 대비 효율 매체를 고르는 방법을 설명합니다.",
    descriptionEn: "How to calculate and compare OOH CPM on THINKAD.",
    keywordsKo: ["OOH CPM", "옥외광고 효율", "매체 비교"],
    keywordsEn: ["OOH CPM", "media comparison"],
    relatedTypes: ["dooh", "billboard", "subway"],
    sections: [
      {
        type: "p",
        textKo:
          "CPM = (광고비 ÷ 노출수) × 1,000. 노출은 DB 유동·임프레션 데이터 또는 추정치를 사용하며, 매체 상세에서 CPM 힌트를 확인할 수 있습니다.",
        textEn: "CPM = (cost ÷ impressions) × 1,000 — check estimates on each listing.",
      },
    ],
    faqsKo: [],
    faqsEn: [],
  },
  {
    slug: "seongsu-popup-ooh",
    publishedAt: "2026-05-10",
    titleKo: "성수동 팝업 OOH 광고 — MZ 타겟 매체 추천",
    titleEn: "Seongsu pop-up OOH — Gen Z media picks",
    descriptionKo:
      "성수·건대 일대 팝업·브랜드 경험 캠페인에 맞는 DOOH·외벽·교통 매체 조합을 추천합니다.",
    descriptionEn: "Media mix ideas for Seongsu pop-up and brand experience campaigns.",
    keywordsKo: ["성수 옥외광고", "성수 팝업", "MZ 광고"],
    keywordsEn: ["Seongsu OOH", "pop-up advertising"],
    relatedLocal: [{ region: "seoul", district: "seongsu" }],
    relatedTypes: ["dooh"],
    sections: [
      {
        type: "p",
        textKo:
          "성수동은 팝업스토어·콜라보 이벤트와 OOH를 결합하기 좋은 지역입니다. 단기 DOOH + SNS 연계가 효과적인 패턴입니다.",
        textEn:
          "Seongsu pairs well with short-flight DOOH plus social amplification.",
      },
    ],
    faqsKo: [],
    faqsEn: [],
  },
];

export function getBlogSeoPost(slug: string): BlogSeoPost | undefined {
  return BLOG_SEO_POSTS.find((p) => p.slug === slug);
}
