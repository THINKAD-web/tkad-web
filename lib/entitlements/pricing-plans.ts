import {
  AI_DAILY_LIMITS,
  API_KEY_MONTHLY_LIMITS,
  CART_COMPARE_MAX_FREE,
  FAVORITES_GUEST_MAX,
  PRO_MONTHLY_KRW,
} from "@/lib/entitlements/constants";

export type PricingPlanKey = "free" | "pro" | "enterprise";

export type PricingPlanFeature = {
  text: string;
  comingSoon?: boolean;
};

export type PricingPlanCard = {
  key: PricingPlanKey;
  price: string;
  features: PricingPlanFeature[];
};

function apiLimitLabel(
  plan: keyof typeof API_KEY_MONTHLY_LIMITS,
  isKo: boolean,
): string {
  const limit = API_KEY_MONTHLY_LIMITS[plan];
  if (limit === null) return isKo ? "무제한" : "Unlimited";
  return isKo
    ? `월 ${limit.toLocaleString("ko-KR")}회`
    : `${limit.toLocaleString("en-US")}/mo`;
}

/** `/pricing` 카드 혜택 — entitlements 단일 소스, 실제 게이팅과 동기화 */
export function getPricingPlans(isKo: boolean): Record<PricingPlanKey, PricingPlanCard> {
  const { guest: aiGuest, user: aiUser, pro: aiPro } = AI_DAILY_LIMITS;

  return {
    free: {
      key: "free",
      price: isKo ? "무료" : "Free",
      features: [
        { text: isKo ? "매체 목록·기본 스펙 조회" : "Media list & basic specs" },
        {
          text: isKo
            ? "플래너 조건 입력 (Step 1~6)"
            : "Planner inputs (steps 1–6)",
        },
        {
          text: isKo
            ? "플래너 결과·시뮬·PDF — PRO 전용"
            : "Planner results, simulation & PDF — PRO only",
        },
        {
          text: isKo
            ? `비교·내 플랜 카트 각 최대 ${CART_COMPARE_MAX_FREE}개`
            : `Compare & plan cart — up to ${CART_COMPARE_MAX_FREE} each`,
        },
        {
          text: isKo
            ? `찜하기 최대 ${FAVORITES_GUEST_MAX}개 (비회원·로그인 동일)`
            : `Favorites — up to ${FAVORITES_GUEST_MAX} (guest or signed in)`,
        },
        {
          text: isKo
            ? `AI 추천·챗봇 일 ${aiUser}회 (로그인) · 비회원 일 ${aiGuest}회`
            : `AI recommend & chat — ${aiUser}/day signed in · ${aiGuest}/day guest`,
        },
      ],
    },
    pro: {
      key: "pro",
      price: isKo
        ? `월 ₩${PRO_MONTHLY_KRW.toLocaleString("ko-KR")}`
        : `₩${PRO_MONTHLY_KRW.toLocaleString("en-US")}/mo`,
      features: [
        {
          text: isKo
            ? "플래너 PDF·PPT 보고서 무제한"
            : "Unlimited planner PDF & PPT reports",
        },
        {
          text: isKo
            ? "상세 유동인구·경쟁 매체 비교"
            : "Detailed footfall & competitor data",
        },
        {
          text: isKo
            ? "OTS·Reach·빈도 시뮬레이션 전체"
            : "Full OTS·Reach·frequency simulation",
        },
        {
          text: isKo
            ? "캠페인 제안서 자동 생성 (AI 스튜디오)"
            : "Auto-generated campaign proposals (AI Studio)",
        },
        {
          text: isKo
            ? "비교·내 플랜 카트 무제한"
            : "Unlimited compare & plan cart",
        },
        {
          text: isKo
            ? `AI 추천·챗봇 일 ${aiPro}회`
            : `AI recommend & chat — ${aiPro}/day`,
        },
        {
          text: isKo
            ? "AI 자유입력 (문장으로 캠페인 조건 분석)"
            : "AI free-text brief parsing",
        },
      ],
    },
    enterprise: {
      key: "enterprise",
      price: isKo ? "문의" : "Contact us",
      features: [
        {
          text: isKo
            ? `API 키 — FREE ${apiLimitLabel("FREE", isKo)} · PRO ${apiLimitLabel("PRO", isKo)} · ENT ${apiLimitLabel("ENTERPRISE", isKo)}`
            : `API keys — FREE ${apiLimitLabel("FREE", isKo)} · PRO ${apiLimitLabel("PRO", isKo)} · ENT ${apiLimitLabel("ENTERPRISE", isKo)}`,
        },
        {
          text: isKo
            ? "시장 인사이트 JSON API (ENTERPRISE 키)"
            : "Market insights JSON API (ENTERPRISE key)",
        },
        {
          text: isKo ? "광고주 화이트라벨 보고서" : "Advertiser white-label reports",
          comingSoon: true,
        },
        {
          text: isKo ? "전담 담당자" : "Dedicated account manager",
          comingSoon: true,
        },
        {
          text: isKo ? "맞춤 데이터 리포트" : "Custom data reports",
          comingSoon: true,
        },
      ],
    },
  };
}

/** 비회원용 가격표 하단 안내 */
export function getPricingGuestFootnote(isKo: boolean): string {
  const { guest: aiGuest } = AI_DAILY_LIMITS;
  return isKo
    ? `비회원: AI 일 ${aiGuest}회 · 찜·비교·플랜 카트 각 최대 ${CART_COMPARE_MAX_FREE}개 · 플래너 결과·PDF는 PRO`
    : `Guests: AI ${aiGuest}/day · favorites & carts up to ${CART_COMPARE_MAX_FREE} each · planner results & PDF require PRO`;
}
