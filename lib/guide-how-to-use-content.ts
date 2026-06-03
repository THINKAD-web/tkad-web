export const HOW_TO_USE_META = {
  titleKo: "THINKAD 싱커드 사용법 — OOH 광고 시작하기",
  titleEn: "How to use THINKAD — Start OOH advertising",
  descriptionKo:
    "매체 탐색부터 AI 플래너, 견적 요청, 포인트·PRO까지. THINKAD 싱커드 OOH 광고 플랫폼을 3분 만에 익혀보세요.",
  descriptionEn:
    "From media discovery to AI planner, quotes, and PRO rewards — learn THINKAD in minutes.",
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

export const HOW_TO_USE_STEPS: HowToUseStep[] = [
  {
    step: "01",
    icon: "🔍",
    titleKo: "원하는 매체 찾기",
    titleEn: "Find the right media",
    bulletsKo: [
      "키워드 검색 (매체명, 지역)",
      "지도에서 위치로 찾기",
      "AI 추천으로 조건에 맞는 매체 추천받기",
      "필터: 지역, 유형, 예산, 가용 여부",
    ],
    bulletsEn: [
      "Keyword search (name, region)",
      "Browse on the map",
      "AI recommendations by goal and budget",
      "Filters: region, type, budget, availability",
    ],
    ctaKo: "매체 검색하기 →",
    ctaEn: "Browse media →",
    href: "/media",
  },
  {
    step: "02",
    icon: "⚖️",
    titleKo: "여러 매체 한 번에 비교",
    titleEn: "Compare placements side by side",
    bulletsKo: [
      '매체 카드에서 "비교 추가" 클릭',
      "최대 3개까지 선택",
      "CPM, 노출수, 가시성 나란히 비교",
      "PRO: 견적서·비교표 PDF 다운로드",
    ],
    bulletsEn: [
      'Click "Add to compare" on media cards',
      "Select up to 3 items",
      "Compare CPM, reach, and visibility",
      "PRO: quote & comparison PDF downloads",
    ],
    ctaKo: "비교 기능 써보기 →",
    ctaEn: "Try compare →",
    href: "/compare",
  },
  {
    step: "03",
    icon: "📦",
    titleKo: "목적별 큐레이션 패키지",
    titleEn: "Curated media packages",
    bulletsKo: [
      "강남 프리미엄, 성수 감성 등 5가지 패키지",
      "업종·목적별로 미리 조합된 매체 묶음",
      "객단가 절약 + 기획 시간 단축",
    ],
    bulletsEn: [
      "Premium Gangnam, Seongsu vibe, and more",
      "Pre-built bundles by industry and goal",
      "Save on CPM and planning time",
    ],
    ctaKo: "패키지 보기 →",
    ctaEn: "View packages →",
    href: "/media/packages",
  },
  {
    step: "04",
    icon: "🤖",
    titleKo: "AI가 최적 플랜 설계",
    titleEn: "AI builds your optimal plan",
    bulletsKo: [
      "예산, 지역, 업종, 목적 입력",
      "AI가 최적 매체 조합 추천",
      "예상 노출·도달·CPM 시뮬레이션",
      "플랜 저장 후 견적 요청 가능",
      "PRO: 상세 시뮬레이션 + PDF 보고서",
    ],
    bulletsEn: [
      "Enter budget, region, industry, and goal",
      "AI recommends the best media mix",
      "Simulate reach, impressions, and CPM",
      "Save plans and request quotes",
      "PRO: advanced simulation + PDF reports",
    ],
    ctaKo: "플래너 써보기 →",
    ctaEn: "Try planner →",
    href: "/planner",
  },
  {
    step: "05",
    icon: "📋",
    titleKo: "견적서 받기 · PDF/PPT",
    titleEn: "Quotes & PRO documents",
    bulletsKo: [
      "견적 마법사에서 매체·기간 선택 후 요청 (무료)",
      "PRO: 견적서 PDF·PPT 서버 출력 (기본/프리미엄)",
      "PRO: 매체·캠페인 제안서 PDF 다운로드",
      "이메일로 견적 PDF 전송 (PRO)",
    ],
    bulletsEn: [
      "Quote wizard: select media & period, then submit (free)",
      "PRO: quote PDF & PPT export (basic/premium)",
      "PRO: media & campaign proposal PDFs",
      "Email quote PDF (PRO)",
    ],
    ctaKo: "견적 마법사 시작 →",
    ctaEn: "Open quote wizard →",
    href: "/quote",
  },
  {
    step: "06",
    icon: "✦",
    titleKo: "포인트 모아서 PRO 무료로",
    titleEn: "Earn points for free PRO",
    bulletsKo: [
      "리뷰 작성, 커뮤니티 활동으로 포인트 적립",
      "2,000P = PRO 1개월 무료",
      "PRO: 상세 데이터, PDF 보고서, 시뮬레이션",
      "지금 가입하면 14일 무료 체험",
    ],
    bulletsEn: [
      "Earn points from reviews and community activity",
      "2,000P = 1 month PRO",
      "PRO: detailed data, PDF reports, simulation",
      "14-day free trial on signup",
    ],
    ctaKo: "포인트 확인 →",
    ctaEn: "View points →",
    href: "/points",
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
      "네, 매체 탐색·비교·기본 플래너·견적 요청은 무료입니다. 견적서/제안서 PDF·PPT 다운로드, 상세 시뮬레이션·플래너 보고서는 PRO(14일 체험 포함)에서 이용할 수 있습니다.",
    answerEn:
      "Yes — browse, compare, basic planner, and quote requests are free. Quote/proposal PDF & PPT, advanced simulation, and planner reports require PRO (includes 14-day trial).",
  },
  {
    questionKo: "PRO 플랜 가격이 얼마인가요?",
    questionEn: "How much does PRO cost?",
    answerKo:
      "월 99,000원이며, 포인트로도 이용 가능합니다. 지금 가입하면 14일 무료 체험이 제공됩니다.",
    answerEn:
      "₩99,000/month, or redeem with points. New signups get a 14-day free trial.",
  },
  {
    questionKo: "광고 집행을 직접 도와주나요?",
    questionEn: "Do you help with campaign execution?",
    answerKo:
      "네, 견적 요청 후 담당자가 배정되어 매체 계약부터 소재 제출, 집행, 리포트까지 전 과정을 도와드립니다.",
    answerEn:
      "Yes. After you request a quote, a manager supports contracts, creative submission, flight, and reporting.",
  },
  {
    questionKo: "매체 가격은 어떻게 책정되나요?",
    questionEn: "How are media prices set?",
    answerKo:
      "매체사가 등록한 공식 단가 기준이며, 집행 기간·조건에 따라 협의 가능합니다.",
    answerEn:
      "Prices follow official rates from media owners; terms may be negotiated by period and conditions.",
  },
  {
    questionKo: "소재 제작도 도와주나요?",
    questionEn: "Do you produce creatives?",
    answerKo:
      "직접 제작은 하지 않지만 파트너 제작사를 연결해드릴 수 있습니다.",
    answerEn:
      "We do not produce creatives in-house, but we can connect you with partner studios.",
  },
  {
    questionKo: "계약 후 취소가 가능한가요?",
    questionEn: "Can I cancel after signing?",
    answerKo:
      "집행 D-14 전까지 취소 가능하며 매체사 정책에 따라 위약금이 발생할 수 있습니다.",
    answerEn:
      "Cancellation is possible until D-14 before flight; penalties may apply per media policy.",
  },
  {
    questionKo: "매체사로 가입하고 싶어요.",
    questionEn: "I want to register as a media owner.",
    answerKo:
      "매체 등록 신청 페이지에서 신청하시면 검토 후 24시간 내 승인됩니다.",
    answerEn:
      "Apply on the media registration page — approval typically within 24 hours after review.",
  },
  {
    questionKo: "포인트는 어떻게 적립하나요?",
    questionEn: "How do I earn points?",
    answerKo:
      "리뷰 작성(200P), 커뮤니티 활동(100P), 출석 체크(10P), 친구 초대(1,000P) 등으로 적립 가능합니다.",
    answerEn:
      "Earn from reviews (200P), community posts (100P), daily check-in (10P), referrals (1,000P), and more.",
  },
  {
    questionKo: "영문 서비스도 이용 가능한가요?",
    questionEn: "Is English supported?",
    answerKo:
      "네, 우측 상단 언어 선택으로 영문 버전 이용 가능합니다.",
    answerEn: "Yes — switch language from the globe icon in the header.",
  },
  {
    questionKo: "문의는 어떻게 하나요?",
    questionEn: "How can I contact you?",
    answerKo:
      "우하단 채팅 버튼, 카카오톡 채널, 또는 02-515-2772로 연락 주세요.",
    answerEn:
      "Use the chat widget, Kakao channel, email, or call 02-515-2772.",
  },
];
