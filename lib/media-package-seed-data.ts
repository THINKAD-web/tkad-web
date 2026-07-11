import type { MediaPackageSeedInput } from "@/lib/media-package-types";

/** DB 시드 + DB 미연결 시 폴백 — /media/packages SSOT */
export const MEDIA_PACKAGE_SEED_DATA: MediaPackageSeedInput[] = [
  {
    slug: "gangnam-premium",
    name: "강남 프리미엄 루트",
    subtitle: "강남·서초 핵심 상권 OOH",
    description:
      "강남대로·테헤란로·신논현 일대 검증 프리미엄 매체. 전국 660+ 카탈로그 중 고가시성 DOOH·빌보드를 묶어 럭셔리·테크 론칭에 맞춥니다.",
    heroColor: "from-violet-600 to-purple-800",
    icon: "🏢",
    order: 1,
    filterRegion: ["강남", "서초", "강남구", "서초구"],
    filterCategory: ["dooh", "billboard"],
    filterTarget: ["brand"],
    filterMaxPrice: null,
    filterMinPrice: null,
    sortBy: "popular",
    badgeText: "프리미엄",
    avgBudget: "월 800만~3,000만원",
    targetIndustry: ["뷰티", "패션", "IT", "금융"],
    guideSteps: [
      { step: 1, title: "매체 선택", desc: "강남 핵심 매체 2~3개 선택" },
      { step: 2, title: "기간 설정", desc: "최소 2주~1개월 권장" },
      { step: 3, title: "소재 제출", desc: "D-7 전까지 소재 전달" },
      { step: 4, title: "집행·인증", desc: "현장 인증 사진 제공" },
    ],
    faqs: [
      {
        q: "최소 예산이 얼마인가요?",
        a: "강남권 DOOH 기준 월 800만원부터 가능합니다. 실제 단가는 카탈로그 매칭 매체에 따라 달라집니다.",
      },
      {
        q: "패키지 할인이 있나요?",
        a: "2개 이상 동시 집행 시 5% 할인이 적용됩니다.",
      },
    ],
  },
  {
    slug: "fandom-hotspot",
    name: "K-콘텐츠 팬덤 패키지",
    subtitle: "아이돌·팬클럽 응원 광고 전문",
    description:
      "강남역·홍대·코엑스 등 팬덤 핫스팟. targetCategory=fandom 매체를 중심으로 660+ 카탈로그에서 자동 매칭합니다.",
    heroColor: "from-pink-600 to-rose-800",
    icon: "🎤",
    order: 2,
    filterRegion: ["강남", "홍대", "코엑스"],
    filterCategory: ["dooh", "subway"],
    filterTarget: ["fandom"],
    filterMaxPrice: null,
    filterMinPrice: null,
    sortBy: "popular",
    badgeText: "팬덤 인기",
    avgBudget: "월 250만~1,500만원",
    targetIndustry: ["엔터", "팬덤"],
    guideSteps: [
      { step: 1, title: "날짜 확인", desc: "생일 기준 D-14 이전 신청 권장" },
      { step: 2, title: "매체 예약", desc: "인기 매체는 조기 마감" },
      { step: 3, title: "소재 제작", desc: "1920×1080px 권장" },
      { step: 4, title: "인증 사진", desc: "현장 고화질 인증 제공" },
    ],
    faqs: [
      {
        q: "최소 집행 기간이 있나요?",
        a: "DOOH는 1주일부터 가능합니다.",
      },
      {
        q: "아이돌 사진 소재 사용이 가능한가요?",
        a: "팬 제작 소재는 대부분 가능하나 매체사 정책 확인이 필요합니다.",
      },
    ],
  },
  {
    slug: "seongsu-vibe",
    name: "성수·한남 감성 루트",
    subtitle: "MZ 타겟 핫플레이스 OOH",
    description:
      "성수·한남·이태원 감성 상권. 팝업·브랜드 목적(event·brand) 태그와 지역 키워드로 최신 매체를 골라 줍니다.",
    heroColor: "from-cyan-600 to-teal-800",
    icon: "✨",
    order: 3,
    filterRegion: ["성수", "한남", "이태원", "성동"],
    filterCategory: [],
    filterTarget: ["event", "brand"],
    filterMaxPrice: null,
    filterMinPrice: null,
    sortBy: "newest",
    badgeText: "MZ 인기",
    avgBudget: "월 300만~1,500만원",
    targetIndustry: ["뷰티", "패션", "F&B"],
    guideSteps: [
      { step: 1, title: "매체 탐색", desc: "성수·한남 인기 매체 비교" },
      { step: 2, title: "예약", desc: "주말 효과 높은 매체 우선 선택" },
      { step: 3, title: "소재", desc: "감성적인 비주얼 중요" },
      { step: 4, title: "인증", desc: "SNS 공유용 고화질 제공" },
    ],
    faqs: [
      {
        q: "성수 매체가 왜 인기인가요?",
        a: "MZ세대 유동인구가 많고 SNS 확산 효과가 큽니다.",
      },
    ],
  },
  {
    slug: "local-starter",
    name: "소상공인 스타터",
    subtitle: "우리 동네 첫 광고, 부담 없이",
    description:
      "월 50만원대부터. small_business 타깃 + 로컬·쉘터 유형으로 카탈로그에서 부담 없는 매체를 매칭합니다.",
    heroColor: "from-emerald-600 to-green-800",
    icon: "🏘",
    order: 4,
    filterRegion: [],
    filterCategory: ["bus_shelter", "local"],
    filterTarget: ["small_business"],
    filterMaxPrice: 3_000_000,
    filterMinPrice: null,
    sortBy: "price_asc",
    badgeText: "소상공인",
    avgBudget: "월 50만~300만원",
    targetIndustry: ["F&B", "유통", "서비스"],
    guideSteps: [
      { step: 1, title: "내 가게 주변", desc: "반경 1km 내 매체 선택" },
      { step: 2, title: "간단 소재", desc: "가게명·연락처·한 줄 메시지" },
      { step: 3, title: "단기 집행", desc: "최소 2주부터 가능" },
      { step: 4, title: "효과 확인", desc: "신규 고객 유입 체크" },
    ],
    faqs: [
      {
        q: "정말 50만원으로 가능한가요?",
        a: "버스쉘터·로컬 빌보드 등 저가 매체가 카탈로그에 다수 있습니다. 매칭 건수를 카드에서 확인하세요.",
      },
      {
        q: "소재 제작도 도와주나요?",
        a: "기본 템플릿을 무료 제공합니다.",
      },
    ],
  },
  {
    slug: "campus-campaign",
    name: "대학가 캠페인",
    subtitle: "대학생 타겟 OOH 전략",
    description:
      "campus 유형 + university 타깃으로 주요 대학가 매체를 모읍니다. 개강·축제 시즌 캠페인에 적합합니다.",
    heroColor: "from-amber-500 to-orange-700",
    icon: "🎓",
    order: 5,
    filterRegion: [],
    filterCategory: ["campus"],
    filterTarget: ["university"],
    filterMaxPrice: null,
    filterMinPrice: null,
    sortBy: "popular",
    badgeText: "대학생 타겟",
    avgBudget: "월 100만~500만원",
    targetIndustry: ["IT", "교육", "뷰티", "패션"],
    guideSteps: [
      { step: 1, title: "대학 선택", desc: "타겟 대학가 매체 확인" },
      { step: 2, title: "시즌 맞추기", desc: "개강·축제 시즌 집중" },
      { step: 3, title: "청년 소재", desc: "MZ 감성 비주얼 중요" },
      { step: 4, title: "반응 측정", desc: "앱 다운로드·방문 체크" },
    ],
    faqs: [
      {
        q: "어느 대학가가 효과적인가요?",
        a: "연세대·고려대·홍대 주변이 유동인구 많아 인기입니다.",
      },
      {
        q: "개강 시즌이 언제인가요?",
        a: "3월, 9월이 가장 효과적입니다.",
      },
    ],
  },
];

export const MEDIA_PACKAGE_SEED_SLUGS = MEDIA_PACKAGE_SEED_DATA.map((p) => p.slug);
