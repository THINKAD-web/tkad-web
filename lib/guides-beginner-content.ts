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
};

export type BeginnerTimelineStep = {
  step: number;
  durationKo: string;
  durationEn: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
};

export type BeginnerFaqItem = {
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
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
};

export const BEGINNER_BASICS_CARDS: BeginnerBasicsCard[] = [
  {
    id: "what-is-ooh",
    icon: MapPin,
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
    titleKo: "매체 유형 총정리",
    titleEn: "Media types overview",
    summaryKo:
      "형태와 노출 환경에 따라 매체가 나뉩니다. 캠페인 목표(인지 vs 전환)에 맞는 포맷을 고르는 것이 첫 단계입니다.",
    summaryEn:
      "Formats differ by environment and reach. Match the placement to your goal — awareness vs action.",
    bulletsKo: [
      "빌보드·전광판 — 랜드마크·도로변 대형 노출",
      "지하철·버스 — 통근·생활 동선 반복",
      "DOOH — 디지털 교체·시간대 송출",
      "백화점·리테일 — 구매 직전 접점",
    ],
    bulletsEn: [
      "Billboards & landmark LEDs",
      "Subway & bus transit",
      "DOOH with flexible creative swaps",
      "Retail & mall digital",
    ],
  },
  {
    id: "cpm",
    icon: TrendingUp,
    titleKo: "CPM이란?",
    titleEn: "What is CPM?",
    summaryKo:
      "CPM(Cost Per Mille)은 1,000회 노출당 비용입니다. 매체 견적을 비교할 때 ‘같은 돈으로 몇 번 보이는가’를 가늠하는 지표로 씁니다.",
    summaryEn:
      "CPM is cost per thousand impressions. It helps compare how much reach you buy for the same budget.",
    bulletsKo: [
      "CPM = 광고비 ÷ (예상 노출 ÷ 1,000)",
      "국내 OOH·DOOH 평균은 매체·지역마다 상이 (수백~수천 원대)",
      "노출 추정치·시인성·위치 프리미엄을 함께 봐야 함",
    ],
    bulletsEn: [
      "CPM = spend ÷ (estimated impressions ÷ 1,000)",
      "Korea OOH CPM varies widely by format and zone",
      "Always weigh visibility and location premium",
    ],
  },
  {
    id: "creative",
    icon: Image,
    titleKo: "소재 제작 가이드",
    titleEn: "Creative specs",
    summaryKo:
      "매체마다 해상도·비율·안전 영역이 다릅니다. 집행 확정 전 ‘매체별 스펙 시트’를 받아 제작하면 재작업을 줄일 수 있습니다.",
    summaryEn:
      "Each placement has its own resolution, ratio, and safe zones. Get the spec sheet before production to avoid costly rework.",
    bulletsKo: [
      "고정형: 인쇄·시트 부착 — 제작 리드타임 1~2주",
      "DOOH: MP4·이미지 — 파일 용량·길이 제한 확인",
      "로고·문구는 3초 안에 읽히게 단순화",
    ],
    bulletsEn: [
      "Static: print/install — often 1–2 weeks lead time",
      "DOOH: MP4/image with duration and size limits",
      "Keep copy readable within ~3 seconds",
    ],
  },
  {
    id: "process",
    icon: ClipboardList,
    titleKo: "집행 프로세스",
    titleEn: "Campaign process",
    summaryKo:
      "탐색 → 견적 → 계약 → 소재 → 집행 → 리포트까지 6단계로 진행됩니다. THINKAD에서는 매체 비교·플래너·상담을 한곳에서 이어갈 수 있습니다.",
    summaryEn:
      "Six stages from discovery to reporting. THINKAD connects browse, planner, and consultant handoff in one flow.",
    bulletsKo: [
      "① 매체 탐색·비교",
      "② 견적·가용 일정 확인",
      "③ 계약·소재 제출",
      "④ 집행·모니터링",
      "⑤ 인증 사진·성과 리포트",
    ],
    bulletsEn: [
      "Discover & compare inventory",
      "Quote & availability",
      "Contract & creative delivery",
      "Launch & monitoring",
      "Proof photos & reporting",
    ],
  },
  {
    id: "budget",
    icon: Banknote,
    titleKo: "예산 설정 가이드",
    titleEn: "Budget planning",
    summaryKo:
      "업종·목표·기간에 따라 월 예산이 달라집니다. 첫 캠페인은 1~2개 핵심 매체에 집중하는 편이 효율적입니다.",
    summaryEn:
      "Monthly spend depends on industry, goals, and duration. First campaigns often work best with 1–2 focused placements.",
    bulletsKo: [
      "뷰티·F&B: 월 300~1,500만 원대 스타트 (지역·포맷별)",
      "IT·금융: 월 500~3,000만 원+ (프리미엄 상권)",
      "테스트: 2주 단기 + DOOH 조합도 가능",
    ],
    bulletsEn: [
      "Beauty/F&B: often ₩3M–15M/month entry tiers",
      "Tech/finance: higher tiers in premium districts",
      "Tests: 2-week flights plus DOOH are common",
    ],
  },
];

export const BEGINNER_TIMELINE: BeginnerTimelineStep[] = [
  {
    step: 1,
    durationKo: "1~3일",
    durationEn: "1–3 days",
    titleKo: "매체 탐색",
    titleEn: "Discover media",
    bodyKo:
      "지역·예산·타깃에 맞는 매체를 검색하고 비교함에 담아 보세요. AI 플래너로 후보도 추천받을 수 있습니다.",
    bodyEn:
      "Search by region, budget, and audience. Use compare lists or the AI planner for shortlists.",
  },
  {
    step: 2,
    durationKo: "약 1일",
    durationEn: "~1 day",
    titleKo: "견적 요청",
    titleEn: "Request a quote",
    bodyKo:
      "선택한 매체로 견적을 요청하면 가용 일정·월 단가·최소 집행 기간을 확인해 드립니다.",
    bodyEn:
      "Request quotes for your picks — we confirm availability, monthly rates, and minimum terms.",
  },
  {
    step: 3,
    durationKo: "3~5일",
    durationEn: "3–5 days",
    titleKo: "계약·소재 제출",
    titleEn: "Contract & creative",
    bodyKo:
      "계약서 서명 후 매체별 규격에 맞춘 소재를 제출합니다. 크리에이티브 스튜디오 업로드도 지원합니다.",
    bodyEn:
      "After contract, deliver creatives per spec — including upload via our creative studio.",
  },
  {
    step: 4,
    durationKo: "집행일",
    durationEn: "Launch day",
    titleKo: "집행 시작",
    titleEn: "Go live",
    bodyKo:
      "게재·송출이 시작되면 일정과 매체 정보를 대시보드에서 확인할 수 있습니다.",
    bodyEn:
      "Once live, track schedules and placements from your dashboard.",
  },
  {
    step: 5,
    durationKo: "집행 중",
    durationEn: "During flight",
    titleKo: "모니터링·인증 사진",
    titleEn: "Monitoring & proof",
    bodyKo:
      "현장 게재 상태를 모니터링하고, 인증 사진으로 집행 증빙을 제공합니다.",
    bodyEn:
      "We monitor on-site status and provide proof-of-posting photos.",
  },
  {
    step: 6,
    durationKo: "종료 후",
    durationEn: "After wrap",
    titleKo: "결과 리포트",
    titleEn: "Results report",
    bodyKo:
      "노출 추정·집행 요약·인증 자료를 정리한 리포트를 받아 다음 캠페인에 활용하세요.",
    bodyEn:
      "Receive a wrap report with reach estimates, summary, and proof assets for your next flight.",
  },
];

export const BEGINNER_FAQS: BeginnerFaqItem[] = [
  {
    questionKo: "최소 집행 기간이 있나요?",
    questionEn: "Is there a minimum booking period?",
    answerKo:
      "매체마다 다르나 일반적으로 2주~1개월입니다. 랜드마크 전광판은 1개월 이상을 요구하는 경우가 많고, DOOH는 단기 테스트도 가능한 매체가 있습니다.",
    answerEn:
      "It varies by placement — often 2 weeks to 1 month. Landmark boards frequently require a month; some DOOH allows shorter tests.",
  },
  {
    questionKo: "소재는 어떻게 제출하나요?",
    questionEn: "How do I submit creatives?",
    answerKo:
      "집행 확정 후 매체별 규격에 맞게 이메일로 전달하거나, THINKAD 크리에이티브 스튜디오에서 업로드할 수 있습니다. 제출 전 스펙 검수를 권장합니다.",
    answerEn:
      "After confirmation, send files by email or upload via THINKAD Creative Studio per placement specs. Pre-check specs to avoid delays.",
  },
  {
    questionKo: "집행 중 변경이 가능한가요?",
    questionEn: "Can I change creatives mid-flight?",
    answerKo:
      "DOOH·디지털 매체는 소재 교체가 가능한 경우가 많습니다. 고정형 빌보드·인쇄물은 게재 후 변경이 어렵습니다. 계약 전 교체 조건을 확인하세요.",
    answerEn:
      "DOOH often allows swaps; static print boards usually do not. Confirm swap terms before signing.",
  },
  {
    questionKo: "효과는 어떻게 측정하나요?",
    questionEn: "How is performance measured?",
    answerKo:
      "노출 추정치, 인증 사진, QR·랜딩 UTM, 매장 방문·브랜드 리프트 조사 등 목표에 맞는 지표를 조합합니다. 완벽한 온라인식 실시간 전환 추적과는 다른 점을 이해하는 것이 중요합니다.",
    answerEn:
      "We combine estimated impressions, proof photos, QR/UTM, store visits, and brand lift where relevant — OOH measures differently from pure performance digital.",
  },
  {
    questionKo: "견적은 무료인가요?",
    questionEn: "Are quotes free?",
    answerKo:
      "네. 매체 견적·상담은 무료입니다. 확정 계약 전까지 비용이 발생하지 않습니다.",
    answerEn:
      "Yes — media quotes and consultation are free until you sign a contract.",
  },
  {
    questionKo: "처음이라 예산이 작은데도 가능한가요?",
    questionEn: "Can I start with a small budget?",
    answerKo:
      "가능합니다. 지하철·버스·중형 DOOH 등 엔트리 매체로 2주~1개월 테스트 후 확장하는 사례가 많습니다.",
    answerEn:
      "Yes. Many brands start with transit or mid-tier DOOH for 2–4 weeks, then scale winners.",
  },
  {
    questionKo: "DOOH와 일반 빌보드의 차이는?",
    questionEn: "DOOH vs traditional billboard?",
    answerKo:
      "DOOH는 디지털 송출로 소재 교체·시간대 타깃이 가능합니다. 일반 빌보드는 고정 게재·인쇄 소재로 임팩트와 지속 노출에 강점이 있습니다.",
    answerEn:
      "DOOH offers digital rotation and dayparting; classic boards excel at fixed, high-impact presence.",
  },
  {
    questionKo: "소재 제작도 대행해 주나요?",
    questionEn: "Do you produce creatives?",
    answerKo:
      "제작 가이드와 검수는 제공하며, 파트너 제작·인하우스 제작 모두 가능합니다. 규격만 맞추면 외부 에이전시 소재도 사용할 수 있습니다.",
    answerEn:
      "We provide specs and review; you may use in-house teams, partners, or our network — as long as files meet placement requirements.",
  },
  {
    questionKo: "여러 매체를 한 번에 집행할 수 있나요?",
    questionEn: "Can I book multiple placements at once?",
    answerKo:
      "가능합니다. 비교함·플래너로 패키지를 구성하고, 하나의 견적·계약 플로우로 진행할 수 있습니다.",
    answerEn:
      "Yes. Build a mix in compare or the planner, then run one quote and contract flow.",
  },
  {
    questionKo: "특정 지역만 타깃할 수 있나요?",
    questionEn: "Can I target specific areas only?",
    answerKo:
      "OOH의 강점이 바로 지역·상권 타깃입니다. 강남·홍대·성수 등 원하는 상권 매체를 골라 집행하면 됩니다.",
    answerEn:
      "Geo targeting is a core OOH strength — pick inventory in districts like Gangnam, Hongdae, or Seongsu.",
  },
];
