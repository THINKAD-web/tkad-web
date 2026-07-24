import {
  proPriceFaqAnswerEn,
  proPriceFaqAnswerKo,
} from "@/lib/entitlements/pricing";

export const HOW_TO_USE_META = {
  titleKo: "THINKAD 싱커드 사용법 — OOH 광고 시작하기",
  titleEn: "How to use THINKAD — Start OOH advertising",
  descriptionKo:
    "매체 검색부터 AI 플랜·견적, 계약·집행, 성과 확인까지. THINKAD 옥외광고 플랫폼 흐름을 3분 만에 익혀보세요.",
  descriptionEn:
    "From media search to AI plans, quotes, contracts, and performance — learn the THINKAD OOH platform in minutes.",
  keywordsKo: "THINKAD, 싱커드, OOH 광고, 사용법, 매체 탐색, AI 플래너, 견적",
  keywordsEn: "THINKAD, OOH advertising, how to use, media search, AI planner, quote",
} as const;

export type HowToUseStep = {
  step: string;
  icon: string;
  titleKo: string;
  titleEn: string;
  bulletsKo: string[];
  bulletsEn: string[];
  ctaKo: string;
  ctaEn: string;
  href: string;
};

/** 핵심 온보딩 4단계 — 발견 → 기획/견적 → 계약·집행 → 성과 */
export const HOW_TO_USE_STEPS: HowToUseStep[] = [
  {
    step: "01",
    icon: "🔍",
    titleKo: "매체 검색 또는 AI 추천",
    titleEn: "Search media or get AI picks",
    bulletsKo: [
      "전국 매체를 지역·유형·단가로 검색합니다",
      "지도에서 위치로 찾아볼 수 있습니다",
      "조건만 넣으면 AI 추천으로도 시작할 수 있습니다",
    ],
    bulletsEn: [
      "Search nationwide media by region, type, and rate",
      "Browse placements on the map",
      "Or start with AI recommendations from your brief",
    ],
    ctaKo: "지금 매체 검색해보기 →",
    ctaEn: "Browse media now →",
    href: "/media",
  },
  {
    step: "02",
    icon: "🤖",
    titleKo: "플랜·견적 확인",
    titleEn: "Review plan and quote",
    bulletsKo: [
      "예산·지역·기간을 넣으면 플랜과 예상 수치를 봅니다",
      "선택한 매체로 견적을 요청할 수 있습니다",
      "비교가 필요하면 매체를 나란히 놓고 확인할 수 있습니다",
    ],
    bulletsEn: [
      "Enter budget, region, and dates to see a plan and estimates",
      "Request a quote on the media you select",
      "Compare placements side by side when you need to",
    ],
    ctaKo: "플랜·견적 확인하기 →",
    ctaEn: "Open planner →",
    href: "/planner",
  },
  {
    step: "03",
    icon: "📋",
    titleKo: "계약·집행",
    titleEn: "Contract and flight",
    bulletsKo: [
      "견적 요청 후 계약과 소재 제출을 이어서 진행합니다",
      "집행 일정과 현장 진행을 플랫폼 흐름 안에서 맞춥니다",
      "진행 중 문의는 상담 채널로 연결됩니다",
    ],
    bulletsEn: [
      "After a quote, continue into contract and creative submission",
      "Align flight dates and field ops in the same flow",
      "Use support channels when you need help mid-campaign",
    ],
    ctaKo: "견적으로 시작하기 →",
    ctaEn: "Start with a quote →",
    href: "/quote",
  },
  {
    step: "04",
    icon: "📊",
    titleKo: "성과 확인",
    titleEn: "Check performance",
    bulletsKo: [
      "집행 후 성과를 확인할 수 있습니다",
      "예측 대비 실측이 기준에 못 미치면 성과 보증 정책을 적용합니다",
      "사업자·정책 안내는 관련 페이지에서 확인합니다",
    ],
    bulletsEn: [
      "Review results after the flight",
      "If measured results fall short of forecast against criteria, the performance guarantee applies",
      "Business and policy details are on the linked pages",
    ],
    ctaKo: "성과 보증 알아보기 →",
    ctaEn: "See performance guarantee →",
    href: "/guarantee",
  },
];

export type HowToUseFaq = {
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
};

export const HOW_TO_USE_FAQS: HowToUseFaq[] = [
  {
    questionKo: "무료로 이용할 수 있나요?",
    questionEn: "Can I use THINKAD for free?",
    answerKo:
      "네. 매체 검색·비교·기본 플래너·견적 요청은 무료로 시작할 수 있습니다. PDF·상세 시뮬레이션 등 일부 기능은 PRO에서 이용할 수 있습니다.",
    answerEn:
      "Yes. Media search, compare, basic planner, and quote requests are free to start. Some exports and advanced simulation require PRO.",
  },
  {
    questionKo: "PRO 플랜 가격이 얼마인가요?",
    questionEn: "How much does PRO cost?",
    answerKo: proPriceFaqAnswerKo(),
    answerEn: proPriceFaqAnswerEn(),
  },
  {
    questionKo: "계약과 집행도 플랫폼에서 이어지나요?",
    questionEn: "Do contract and flight continue on the platform?",
    answerKo:
      "견적 요청 이후 계약·소재 제출·집행 일정 조율을 이어서 진행합니다. 필요하면 담당 상담이 함께합니다.",
    answerEn:
      "After a quote, contract, creative submission, and flight scheduling continue in the same flow. A manager can support when needed.",
  },
  {
    questionKo: "매체 가격은 어떻게 보나요?",
    questionEn: "How do I see media prices?",
    answerKo:
      "매체 상세와 검색 결과에서 공개 단가를 확인할 수 있습니다. 기간·옵션에 따라 최종 견적은 달라질 수 있습니다.",
    answerEn:
      "Public rates appear on media detail and search results. Final quotes can vary by period and options.",
  },
  {
    questionKo: "AI 추천은 어디서 시작하나요?",
    questionEn: "Where do I start AI recommendations?",
    answerKo:
      "홈의 AI 추천 또는 /recommend, /planner에서 조건(지역·예산·목적)을 넣고 시작할 수 있습니다.",
    answerEn:
      "Start from AI recommend on the home page, /recommend, or /planner with region, budget, and goal.",
  },
  {
    questionKo: "성과가 예측보다 낮으면요?",
    questionEn: "What if results fall short of the forecast?",
    answerKo:
      "성과 보증 정책에 따라 예측 대비 실측이 기준에 못 미치면 환불 절차를 안내합니다. 자세한 조건은 성과 보증 페이지를 확인하세요.",
    answerEn:
      "Under the performance guarantee, if measured results fall short of forecast against criteria, we guide the refund process. See the guarantee page for terms.",
  },
  {
    questionKo: "매체사로 가입하고 싶어요.",
    questionEn: "I want to register as a media owner.",
    answerKo:
      "매체 등록 신청 페이지에서 신청하시면 검토 후 안내드립니다.",
    answerEn:
      "Apply on the media registration page — we review and follow up.",
  },
  {
    questionKo: "문의는 어떻게 하나요?",
    questionEn: "How can I contact you?",
    answerKo:
      "우하단 채팅, 카카오톡 채널, 또는 02-515-2772로 연락 주세요.",
    answerEn:
      "Use the chat widget, Kakao channel, or call 02-515-2772.",
  },
];
