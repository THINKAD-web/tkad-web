import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ClipboardList,
  Image,
  Layers,
  MapPin,
  TrendingUp,
} from "lucide-react";

export type BeginnerBasicsCard = {
  id: string;
  icon: LucideIcon;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  bulletsKo: string[];
  bulletsEn: string[];
  /** Full-width card on md+ when true */
  wide?: boolean;
};

export type ComparisonRow = {
  labelKo: string;
  labelEn: string;
  oohKo: string;
  oohEn: string;
  digitalKo: string;
  digitalEn: string;
};

export type MediaTypeDetail = {
  nameKo: string;
  nameEn: string;
  traitsKo: string[];
  traitsEn: string[];
  formatsKo: string;
  formatsEn: string;
  suitableKo: string;
  suitableEn: string;
  priceKo: string;
  priceEn: string;
};

export type CreativeSpecRow = {
  formatKo: string;
  formatEn: string;
  sizeKo: string;
  sizeEn: string;
  fileKo: string;
  fileEn: string;
  leadKo: string;
  leadEn: string;
};

export type BudgetIndustryGuide = {
  industryKo: string;
  industryEn: string;
  tiersKo: { label: string; budget: string; placement: string }[];
  tiersEn: { label: string; budget: string; placement: string }[];
};

export type BeginnerTimelineStep = {
  step: number;
  durationKo: string;
  durationEn: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  thinkadKo: string[];
  thinkadEn: string[];
  advertiserKo?: string[];
  advertiserEn?: string[];
};

export type BeginnerFaqItem = {
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
};

export type BeginnerTrustMetric = {
  valueKo: string;
  valueEn: string;
  labelKo: string;
  labelEn: string;
};

export const BEGINNER_GUIDE_META = {
  titleKo: "OOH 광고 초보자 가이드 | THINKAD 싱커드",
  titleEn: "OOH Advertising Beginner's Guide | THINKAD",
  descriptionKo:
    "OOH·옥외광고가 처음이신가요? 매체 유형, CPM, 소재 규격, 집행 절차, 예산 설정까지 THINKAD가 한눈에 정리해 드립니다.",
  descriptionEn:
    "New to OOH? Media types, CPM, creative specs, booking steps, and budget planning — everything beginners need from THINKAD.",
  heroTitleKo: "OOH 광고, 처음이세요?",
  heroTitleEn: "New to OOH advertising?",
  heroSubtitleKo:
    "강남 전광판부터 지하철 광고까지 — 시작 전 꼭 알아야 할 것들",
  heroSubtitleEn:
    "From Gangnam billboards to subway ads — what every first-time advertiser should know",
  keywordsKo: [
    "OOH 광고",
    "옥외광고",
    "옥외광고 초보",
    "DOOH",
    "빌보드 광고",
    "지하철 광고",
    "CPM",
    "옥외광고 견적",
    "THINKAD",
    "싱커드",
  ],
  keywordsEn: [
    "OOH advertising",
    "outdoor advertising Korea",
    "DOOH",
    "billboard advertising",
    "subway ads",
    "CPM OOH",
    "THINKAD",
  ],
  publishedAt: "2026-05-20T00:00:00+09:00",
  modifiedAt: "2026-05-21T00:00:00+09:00",
};

export const OOH_VS_DIGITAL_COMPARISON: ComparisonRow[] = [
  {
    labelKo: "도달 범위",
    labelEn: "Reach",
    oohKo: "특정 상권·동선에 집중, 반복 노출",
    oohEn: "Concentrated in districts and daily routes with repetition",
    digitalKo: "전국·세그먼트 단위 확장 가능",
    digitalEn: "Scalable nationwide with audience segments",
  },
  {
    labelKo: "타겟팅",
    labelEn: "Targeting",
    oohKo: "지역·상권·매체 유형 기반",
    oohEn: "Geo, district, and format-based",
    digitalKo: "연령·관심사·리타겟팅 정밀",
    digitalEn: "Precise age, interest, and retargeting",
  },
  {
    labelKo: "비용",
    labelEn: "Cost",
    oohKo: "월 단가 고정, CPM 2,000~8,000원대",
    oohEn: "Fixed monthly rates; CPM often ₩2K–8K",
    digitalKo: "입찰·일예산 변동, CPM 변동 큼",
    digitalEn: "Auction-based daily budgets; volatile CPM",
  },
  {
    labelKo: "측정",
    labelEn: "Measurement",
    oohKo: "노출 추정·현장 인증·브랜드 검색량",
    oohEn: "Estimated impressions, proof photos, brand search lift",
    digitalKo: "클릭·전환·ROAS 실시간 추적",
    digitalEn: "Real-time clicks, conversions, ROAS",
  },
];

export const OOH_EFFECTIVE_CAMPAIGNS_KO = [
  "신제품 론칭",
  "브랜드 인지",
  "팝업 이벤트",
  "시즌 프로모션",
];

export const OOH_EFFECTIVE_CAMPAIGNS_EN = [
  "Product launches",
  "Brand awareness",
  "Pop-up events",
  "Seasonal promotions",
];

export const OOH_GANGNAM_STAT_KO = "강남역 일대 월 노출 추정 500만+";
export const OOH_GANGNAM_STAT_EN = "Gangnam Station area: 5M+ estimated monthly impressions";

export const MEDIA_TYPE_DETAILS: MediaTypeDetail[] = [
  {
    nameKo: "빌보드·전광판",
    nameEn: "Billboards & landmark LEDs",
    traitsKo: ["도로변 대형 노출", "랜드마크 연상"],
    traitsEn: ["Large roadside presence", "Landmark association"],
    formatsKo: "규격: 대형(10m×4m~), 소형(3m×2m~)",
    formatsEn: "Sizes: large (10m×4m+), small (3m×2m+)",
    suitableKo: "적합: 브랜드 인지, 자동차·부동산·금융",
    suitableEn: "Best for: awareness, auto, real estate, finance",
    priceKo: "평균 단가: 월 300만~3,000만원 (위치별 상이)",
    priceEn: "Typical: ₩3M–30M/month (location-dependent)",
  },
  {
    nameKo: "지하철 광고",
    nameEn: "Subway advertising",
    traitsKo: ["출퇴근 반복 노출", "체류시간 길어"],
    traitsEn: ["Commute repetition", "Longer dwell time"],
    formatsKo: "종류: 스크린도어, 역사 랩핑, 내부 패널",
    formatsEn: "Formats: platform doors, station wrap, interior panels",
    suitableKo: "적합: 앱·서비스, 엔터, 뷰티",
    suitableEn: "Best for: apps, entertainment, beauty",
    priceKo: "평균 단가: 월 100만~500만원",
    priceEn: "Typical: ₩1M–5M/month",
  },
  {
    nameKo: "버스 광고",
    nameEn: "Bus advertising",
    traitsKo: ["이동 중 노출", "지역 커버리지 넓어"],
    traitsEn: ["Mobile exposure", "Broad local coverage"],
    formatsKo: "종류: 버스 래핑, 쉘터 광고",
    formatsEn: "Formats: bus wrap, shelter ads",
    suitableKo: "적합: 지역 기반 서비스, 유통",
    suitableEn: "Best for: local services, retail",
    priceKo: "평균 단가: 월 80만~400만원",
    priceEn: "Typical: ₩0.8M–4M/month",
  },
  {
    nameKo: "DOOH(디지털 옥외)",
    nameEn: "DOOH (digital out-of-home)",
    traitsKo: ["소재 교체 자유", "시간대별 송출"],
    traitsEn: ["Flexible creative swaps", "Daypart scheduling"],
    formatsKo: "종류: 전광판, 실내 디지털 사이니지",
    formatsEn: "Formats: digital boards, indoor signage",
    suitableKo: "적합: 신제품, 이벤트, 프로모션",
    suitableEn: "Best for: launches, events, promotions",
    priceKo: "평균 단가: 월 200만~2,000만원",
    priceEn: "Typical: ₩2M–20M/month",
  },
];

export const CPM_EXAMPLE_KO = {
  title: "실제 계산 예시",
  lines: [
    "강남역 스크린도어 월 단가 200만원",
    "월 노출 50만회 → CPM = 4,000원",
    "계산: 2,000,000 ÷ (500,000 ÷ 1,000) = 4,000원",
  ],
};

export const CPM_EXAMPLE_EN = {
  title: "Worked example",
  lines: [
    "Gangnam platform door: ₩2M/month",
    "500K monthly impressions → CPM = ₩4,000",
    "Formula: 2,000,000 ÷ (500,000 ÷ 1,000) = 4,000",
  ],
};

export const CPM_BENCHMARKS_KO = [
  "OOH 평균 CPM: 2,000~8,000원대",
  "TV CPM 대비 OOH가 40~60% 저렴한 경우가 많음",
  "좋은 CPM: 상권·시인성 대비 5,000원 이하",
  "나쁜 CPM: 노출 추정만 높고 시인성·체류가 낮은 매체",
];

export const CPM_BENCHMARKS_EN = [
  "Typical OOH CPM: ₩2K–8K range",
  "OOH is often 40–60% cheaper than TV CPM",
  "Strong CPM: under ~₩5K with good visibility",
  "Weak CPM: high estimates but poor visibility/dwell",
];

export const CPM_BEYOND_KO = [
  "CPM만 보면 안 되는 이유:",
  "시인성(가시성) — 차량·보행자 시선에 실제로 잡히는가",
  "체류시간 — 지하철·쉘터는 TV보다 길어 메시지 전달 유리",
  "상권 질 — 타깃 고객이 실제로 있는 지역인가",
];

export const CPM_BEYOND_EN = [
  "Why CPM alone isn't enough:",
  "Visibility — does the placement actually catch eyes?",
  "Dwell time — transit formats allow longer message absorption",
  "District quality — does the trade area match your audience?",
];

export const CREATIVE_SPEC_ROWS: CreativeSpecRow[] = [
  {
    formatKo: "빌보드(고정형)",
    formatEn: "Static billboard",
    sizeKo: "매체별 실제 사이즈 확인 필요",
    sizeEn: "Confirm exact placement dimensions",
    fileKo: "인쇄 해상도 72dpi 이상",
    fileEn: "Print-ready 72dpi+",
    leadKo: "제작 기간 1~2주",
    leadEn: "1–2 weeks production",
  },
  {
    formatKo: "지하철 스크린도어",
    formatEn: "Subway platform door",
    sizeKo: "1,140×420px",
    sizeEn: "1,140×420px",
    fileKo: "JPG·PNG / 5MB 이하",
    fileEn: "JPG·PNG / under 5MB",
    leadKo: "제출 D-7",
    leadEn: "Submit by D-7",
  },
  {
    formatKo: "DOOH 영상",
    formatEn: "DOOH video",
    sizeKo: "1920×1080",
    sizeEn: "1920×1080",
    fileKo: "MP4 H.264 / 15초·30초 / 5~50MB",
    fileEn: "MP4 H.264 / 15s·30s / 5–50MB",
    leadKo: "제출 D-7",
    leadEn: "Submit by D-7",
  },
  {
    formatKo: "DOOH 이미지",
    formatEn: "DOOH still",
    sizeKo: "1920×1080",
    sizeEn: "1920×1080",
    fileKo: "JPG·PNG / 5MB 이하",
    fileEn: "JPG·PNG / under 5MB",
    leadKo: "제출 D-7",
    leadEn: "Submit by D-7",
  },
];

export const CREATIVE_WARNINGS_KO = [
  "소재 제출 마감: 집행 시작 D-7 이전",
  "텍스트는 전체 면적 30% 이하 권장",
  "3초 룰: 핵심 메시지를 3초 안에 전달",
];

export const CREATIVE_WARNINGS_EN = [
  "Creative deadline: at least 7 days before launch",
  "Keep copy under ~30% of the layout area",
  "3-second rule: core message must land within 3 seconds",
];

export const BUDGET_INDUSTRY_GUIDES: BudgetIndustryGuide[] = [
  {
    industryKo: "뷰티·화장품",
    industryEn: "Beauty & cosmetics",
    tiersKo: [
      { label: "테스트 (첫 캠페인)", budget: "월 300~500만원", placement: "성수 or 홍대 DOOH 1~2면" },
      { label: "성장기", budget: "월 500~1,500만원", placement: "강남 미디어폴 + 지하철 조합" },
      { label: "풀 캠페인", budget: "월 1,500만원+", placement: "강남+홍대+성수 멀티 지역" },
    ],
    tiersEn: [
      { label: "Test (first flight)", budget: "₩3M–5M/month", placement: "1–2 DOOH in Seongsu or Hongdae" },
      { label: "Growth", budget: "₩5M–15M/month", placement: "Gangnam media pole + subway mix" },
      { label: "Full campaign", budget: "₩15M+/month", placement: "Gangnam + Hongdae + Seongsu multi-zone" },
    ],
  },
  {
    industryKo: "IT·앱",
    industryEn: "IT & apps",
    tiersKo: [
      { label: "테스트", budget: "월 200~500만원", placement: "지하철 스크린도어" },
      { label: "성장기", budget: "월 500~2,000만원", placement: "지하철 + DOOH 조합" },
      { label: "풀 캠페인", budget: "월 2,000만원+", placement: "강남·판교·성수 멀티" },
    ],
    tiersEn: [
      { label: "Test", budget: "₩2M–5M/month", placement: "Subway platform doors" },
      { label: "Growth", budget: "₩5M–20M/month", placement: "Subway + DOOH mix" },
      { label: "Full campaign", budget: "₩20M+/month", placement: "Gangnam, Pangyo, Seongsu multi-zone" },
    ],
  },
  {
    industryKo: "F&B",
    industryEn: "F&B",
    tiersKo: [
      { label: "테스트", budget: "월 200~400만원", placement: "근처 버스쉘터" },
      { label: "지역 밀착", budget: "월 300~800만원", placement: "상권 버스·지하철 조합" },
      { label: "확장", budget: "월 800만원+", placement: "핵심 상권 2~3곳 동시" },
    ],
    tiersEn: [
      { label: "Test", budget: "₩2M–4M/month", placement: "Nearby bus shelters" },
      { label: "Local focus", budget: "₩3M–8M/month", placement: "District bus + subway mix" },
      { label: "Scale", budget: "₩8M+/month", placement: "2–3 core districts at once" },
    ],
  },
];

export const FIRST_CAMPAIGN_TIPS_KO = [
  "1~2개 매체에 집중 (분산 금지)",
  "최소 2주~1개월 집행 (1주는 효과 측정 불가)",
  "DOOH로 시작하면 소재 교체 유연",
];

export const FIRST_CAMPAIGN_TIPS_EN = [
  "Focus on 1–2 placements — avoid spreading too thin",
  "Run at least 2 weeks to 1 month (1 week is too short to measure)",
  "Start with DOOH for flexible creative swaps",
];

export const BEGINNER_BASICS_CARDS: BeginnerBasicsCard[] = [
  {
    id: "what-is-ooh",
    icon: MapPin,
    wide: true,
    titleKo: "OOH 광고란?",
    titleEn: "What is OOH?",
    summaryKo:
      "Out-of-Home(옥외) 광고는 이동 중·생활 반경에서 브랜드를 노출하는 매체입니다. TV·디지털과 달리 ‘지나가는 순간’에 반복 노출된다는 점이 강점입니다.",
    summaryEn:
      "Out-of-Home (OOH) reaches people on the move — in streets, stations, and daily life. Unlike TV or digital alone, it wins on repeated real-world presence.",
    bulletsKo: [
      "브랜드 인지·신뢰 구축에 유리",
      "지역·상권 타깃팅 가능",
      "디지털(DOOH)과 결합 시 유연한 운영",
    ],
    bulletsEn: [
      "Strong for awareness and trust",
      "Geo and district targeting",
      "Flexible when paired with DOOH",
    ],
  },
  {
    id: "media-types",
    icon: Layers,
    wide: true,
    titleKo: "매체 유형 총정리",
    titleEn: "Media types overview",
    summaryKo:
      "형태와 노출 환경에 따라 매체가 나뉩니다. 캠페인 목표(인지 vs 전환)에 맞는 포맷을 고르는 것이 첫 단계입니다.",
    summaryEn:
      "Formats differ by environment and reach. Match the placement to your goal — awareness vs action.",
    bulletsKo: [],
    bulletsEn: [],
  },
  {
    id: "cpm",
    icon: TrendingUp,
    wide: true,
    titleKo: "CPM 계산법",
    titleEn: "How to calculate CPM",
    summaryKo:
      "CPM(Cost Per Mille)은 1,000회 노출당 비용입니다. 매체 견적을 비교할 때 ‘같은 돈으로 몇 번 보이는가’를 가늠하는 지표로 씁니다.",
    summaryEn:
      "CPM is cost per thousand impressions. It helps compare how much reach you buy for the same budget.",
    bulletsKo: ["CPM = 광고비 ÷ (예상 노출 ÷ 1,000)"],
    bulletsEn: ["CPM = spend ÷ (estimated impressions ÷ 1,000)"],
  },
  {
    id: "creative",
    icon: Image,
    wide: true,
    titleKo: "소재 제작 가이드",
    titleEn: "Creative specs",
    summaryKo:
      "매체마다 해상도·비율·안전 영역이 다릅니다. 집행 확정 전 ‘매체별 스펙 시트’를 받아 제작하면 재작업을 줄일 수 있습니다.",
    summaryEn:
      "Each placement has its own resolution, ratio, and safe zones. Get the spec sheet before production to avoid costly rework.",
    bulletsKo: [],
    bulletsEn: [],
  },
  {
    id: "process",
    icon: ClipboardList,
    titleKo: "집행 프로세스",
    titleEn: "Campaign process",
    summaryKo:
      "탐색 → 견적 → 계약 → 소재 → 집행 → 리포트까지 5단계로 진행됩니다. 아래 타임라인에서 단계별 소요 기간과 싱커드 담당 업무를 확인하세요.",
    summaryEn:
      "Five stages from discovery to reporting. See the timeline below for durations and THINKAD responsibilities.",
    bulletsKo: [
      "① 매체 탐색·비교 (1~3일)",
      "② 견적·가용 확인 (1~2일)",
      "③ 계약·소재 제출 (3~7일)",
      "④ 집행·모니터링 (집행 기간)",
      "⑤ 결과 리포트 (종료 후 3~5일)",
    ],
    bulletsEn: [
      "① Discover & compare (1–3 days)",
      "② Quote & availability (1–2 days)",
      "③ Contract & creative (3–7 days)",
      "④ Launch & monitoring (flight period)",
      "⑤ Results report (3–5 days after wrap)",
    ],
  },
  {
    id: "budget",
    icon: Banknote,
    wide: true,
    titleKo: "예산 설정 가이드",
    titleEn: "Budget planning",
    summaryKo:
      "업종·목표·기간에 따라 월 예산이 달라집니다. 첫 캠페인은 1~2개 핵심 매체에 집중하는 편이 효율적입니다.",
    summaryEn:
      "Monthly spend depends on industry, goals, and duration. First campaigns often work best with 1–2 focused placements.",
    bulletsKo: [],
    bulletsEn: [],
  },
];

export const BEGINNER_TIMELINE: BeginnerTimelineStep[] = [
  {
    step: 1,
    durationKo: "1~3일",
    durationEn: "1–3 days",
    titleKo: "매체 탐색·비교",
    titleEn: "Discover & compare",
    bodyKo: "지역·예산·타깃에 맞는 매체를 검색하고 비교함에 담아 보세요. AI 플래너로 후보도 추천받을 수 있습니다.",
    bodyEn: "Search by region, budget, and audience. Use compare lists or the AI planner for shortlists.",
    thinkadKo: ["조건에 맞는 매체 리스트업", "가용 일정·월 단가 사전 확인"],
    thinkadEn: ["Shortlist matching your criteria", "Pre-check availability and monthly rates"],
  },
  {
    step: 2,
    durationKo: "1~2일",
    durationEn: "1–2 days",
    titleKo: "견적·가용 확인",
    titleEn: "Quote & availability",
    bodyKo: "선택한 매체로 견적을 요청하면 가용 일정·월 단가·최소 집행 기간을 확인해 드립니다.",
    bodyEn: "Request quotes for your picks — we confirm availability, monthly rates, and minimum terms.",
    thinkadKo: ["정식 견적서 발행", "계약 조건·최소 집행 기간 안내"],
    thinkadEn: ["Issue formal quote", "Explain contract terms and minimum periods"],
  },
  {
    step: 3,
    durationKo: "3~7일",
    durationEn: "3–7 days",
    titleKo: "계약·소재 제출",
    titleEn: "Contract & creative",
    bodyKo: "계약서 서명 후 매체별 규격에 맞춘 소재를 제출합니다. 크리에이티브 스튜디오 업로드도 지원합니다.",
    bodyEn: "After contract, deliver creatives per spec — including upload via our creative studio.",
    thinkadKo: ["매체사 소재 검수·전달", "규격 미달 시 수정 가이드 제공"],
    thinkadEn: ["Review and forward to media owners", "Spec correction guidance if needed"],
    advertiserKo: ["계약서 서명", "소재 파일 전달 (D-7 이전)"],
    advertiserEn: ["Sign contract", "Deliver creative files (by D-7)"],
  },
  {
    step: 4,
    durationKo: "집행 기간",
    durationEn: "During flight",
    titleKo: "집행·모니터링",
    titleEn: "Launch & monitoring",
    bodyKo: "게재·송출이 시작되면 일정과 매체 정보를 대시보드에서 확인할 수 있습니다.",
    bodyEn: "Once live, track schedules and placements from your dashboard.",
    thinkadKo: ["현장 인증 사진 촬영·업로드", "이상 발생 시 즉시 대응·알림톡 발송"],
    thinkadEn: ["Proof-of-posting photos uploaded", "Immediate response + Alimtalk alerts"],
  },
  {
    step: 5,
    durationKo: "종료 후 3~5일",
    durationEn: "3–5 days after wrap",
    titleKo: "결과 리포트",
    titleEn: "Results report",
    bodyKo: "노출 추정·집행 요약·인증 자료를 정리한 리포트를 받아 다음 캠페인에 활용하세요.",
    bodyEn: "Receive a wrap report with reach estimates, summary, and proof assets for your next flight.",
    thinkadKo: ["노출 추정·인증 사진 모음", "PDF 리포트 발송"],
    thinkadEn: ["Reach estimates + proof gallery", "PDF wrap report delivery"],
  },
];

export const BEGINNER_FAQS: BeginnerFaqItem[] = [
  {
    questionKo: "최소 집행 기간이 있나요?",
    questionEn: "Is there a minimum booking period?",
    answerKo:
      "매체마다 다르나 DOOH는 1주일부터, 고정형은 2주~1개월이 일반적입니다. 랜드마크 전광판은 1개월 이상을 요구하는 경우가 많습니다.",
    answerEn:
      "It varies — DOOH can start from 1 week; static formats typically need 2 weeks to 1 month. Landmark boards often require a month or more.",
  },
  {
    questionKo: "광고 효과는 어떻게 측정하나요?",
    questionEn: "How is ad performance measured?",
    answerKo:
      "유동인구 기반 노출 추정치, 현장 인증 사진, 집행 전후 브랜드 검색량 비교로 측정합니다. QR·UTM·매장 방문 데이터를 함께 보면 더 정확합니다.",
    answerEn:
      "We combine foot-traffic-based impression estimates, proof photos, and brand search lift before/after the flight. QR, UTM, and store visit data add precision.",
  },
  {
    questionKo: "소재가 없어도 제작 도움을 받을 수 있나요?",
    questionEn: "Can you help if I don't have creatives?",
    answerKo:
      "싱커드는 소재 제작 파트너를 연결해드릴 수 있습니다. 제작비는 별도이며 평균 50~200만원대입니다. 규격 가이드와 검수는 무료로 제공합니다.",
    answerEn:
      "THINKAD can connect you with production partners. Production is separate, typically ₩0.5M–2M. Spec guidance and review are included.",
  },
  {
    questionKo: "계약 후 취소나 변경이 가능한가요?",
    questionEn: "Can I cancel or change after signing?",
    answerKo:
      "집행 시작 D-14 전까지는 매체·기간 변경이 가능합니다. 단, 매체사 정책에 따라 위약금이 발생할 수 있습니다. DOOH는 소재 교체가 비교적 유연합니다.",
    answerEn:
      "Changes to media or dates are possible until 14 days before launch. Penalties may apply per media owner policy. DOOH creative swaps are more flexible.",
  },
  {
    questionKo: "전국 동시 집행도 가능한가요?",
    questionEn: "Can I run nationwide at once?",
    answerKo:
      "네, 서울+부산+대구+광주 등 전국 동시 집행이 가능합니다. ‘전국 주요도시 론칭 패키지’를 확인하거나 플래너로 멀티 지역 구성을 요청하세요.",
    answerEn:
      "Yes — simultaneous flights in Seoul, Busan, Daegu, Gwangju, and more. Check our major-city launch packages or use the planner for multi-region mixes.",
  },
  {
    questionKo: "소기업·스타트업도 이용 가능한가요?",
    questionEn: "Can startups and small businesses use THINKAD?",
    answerKo:
      "월 200만원대 소규모 집행부터 가능합니다. 예산에 맞는 매체를 추천해드리며, 2주 DOOH 테스트로 시작하는 사례가 많습니다.",
    answerEn:
      "Yes — entry flights from around ₩2M/month. We recommend budget-fit inventory; many startups begin with a 2-week DOOH test.",
  },
  {
    questionKo: "카드 결제가 되나요?",
    questionEn: "Do you accept card payments?",
    answerKo:
      "세금계산서 발행 후 계좌이체가 기본이며, 소액 DOOH는 카드 결제도 가능합니다. 견적 단계에서 결제 방식을 함께 안내드립니다.",
    answerEn:
      "Bank transfer after tax invoice is standard; card payment is available for smaller DOOH bookings. We confirm payment options at quote stage.",
  },
  {
    questionKo: "집행 중 광고가 제대로 되고 있는지 어떻게 알아요?",
    questionEn: "How do I know my ad is live correctly?",
    answerKo:
      "싱커드 담당자가 현장 인증 사진을 촬영해 광고주 대시보드에 업로드합니다. 카카오 알림톡으로도 게재 시작·이상 발생을 알려드립니다.",
    answerEn:
      "Our team captures proof photos and uploads them to your dashboard. Kakao Alimtalk alerts you on launch and any issues.",
  },
  {
    questionKo: "견적은 무료인가요?",
    questionEn: "Are quotes free?",
    answerKo:
      "네. 매체 견적·상담은 무료입니다. 확정 계약 전까지 비용이 발생하지 않으며, 평균 24시간 이내에 1차 응답을 드립니다.",
    answerEn:
      "Yes — media quotes and consultation are free until you sign. We typically respond within 24 hours.",
  },
  {
    questionKo: "DOOH와 일반 빌보드의 차이는?",
    questionEn: "DOOH vs traditional billboard?",
    answerKo:
      "DOOH는 디지털 송출로 소재 교체·시간대 타깃이 가능합니다. 일반 빌보드는 고정 게재·인쇄 소재로 임팩트와 지속 노출에 강점이 있습니다. 첫 캠페인은 DOOH 테스트 후 고정형 확장을 추천합니다.",
    answerEn:
      "DOOH offers digital rotation and dayparting; classic boards excel at fixed, high-impact presence. Many brands test with DOOH first, then scale to static formats.",
  },
];

export const BEGINNER_TRUST_METRICS: BeginnerTrustMetric[] = [
  {
    valueKo: "24시간",
    valueEn: "24h",
    labelKo: "평균 응답 24시간 이내",
    labelEn: "Average response within 24 hours",
  },
  {
    valueKo: "{count}",
    valueEn: "{count}",
    labelKo: "검증 매체 보유",
    labelEn: "Verified media inventory",
  },
  {
    valueKo: "50억+",
    valueEn: "₩5B+",
    labelKo: "누적 집행 금액",
    labelEn: "Cumulative campaign spend",
  },
];

export function buildBeginnerTrustMetrics(
  verifiedMediaLabel: string,
): BeginnerTrustMetric[] {
  return BEGINNER_TRUST_METRICS.map((m) => ({
    ...m,
    valueKo: m.valueKo.replace("{count}", verifiedMediaLabel),
    valueEn: m.valueEn.replace("{count}", verifiedMediaLabel),
  }));
}
