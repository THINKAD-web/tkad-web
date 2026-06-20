import { featureLabel } from "@/lib/report-access-shared";
import {
  AI_DAILY_LIMITS,
  API_KEY_MONTHLY_LIMITS,
  COMPARE_MAX_ITEMS,
  FAVORITES_GUEST_MAX,
  FREE_PLANNER_INPUT_LAST_STEP,
  FREE_PLANNER_PDF_LIMIT,
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
} from "@/lib/entitlements/constants";
import { FEATURE_MIN_LEVEL, type ReportFeature } from "@/lib/entitlements/features";
import { formatEntitlementLimit } from "@/lib/entitlements/gate-messages";

export type PricingPlanId = "free" | "pro" | "enterprise";

export type PricingPlanFeature = {
  id: string;
  text: string;
  comingSoon?: boolean;
};

export type PricingPlanCard = {
  id: PricingPlanId;
  features: PricingPlanFeature[];
};

function apiLimitsSummary(isKo: boolean): string {
  const free = formatEntitlementLimit(
    API_KEY_MONTHLY_LIMITS.FREE,
    isKo,
    "회/월",
    "/mo",
  );
  const pro = formatEntitlementLimit(
    API_KEY_MONTHLY_LIMITS.PRO,
    isKo,
    "회/월",
    "/mo",
  );
  const ent = formatEntitlementLimit(
    API_KEY_MONTHLY_LIMITS.ENTERPRISE,
    isKo,
    "회/월",
    "/mo",
  );
  return isKo
    ? `Public API (FREE ${free} · PRO ${pro} · Enterprise ${ent})`
    : `Public API (FREE ${free} · PRO ${pro} · Enterprise ${ent})`;
}

function proFeatureBullets(isKo: boolean): PricingPlanFeature[] {
  const proFeatures = (Object.keys(FEATURE_MIN_LEVEL) as ReportFeature[]).filter(
    (f) => FEATURE_MIN_LEVEL[f] === "PRO",
  );

  return proFeatures.map((f) => ({
    id: f,
    text: featureLabel(f, isKo),
  }));
}

/** /pricing 카드 혜택 — entitlements 상수·FEATURE_MIN_LEVEL 단일 소스 */
export function getPricingPlans(isKo: boolean): PricingPlanCard[] {
  const cartFree = formatEntitlementLimit(
    PLAN_CART_MAX_ITEMS_FREE,
    isKo,
    "개",
    " items",
  );
  const cartPro = formatEntitlementLimit(
    PLAN_CART_MAX_ITEMS_PRO,
    isKo,
    "개",
    " items",
  );
  const compareMax = formatEntitlementLimit(
    COMPARE_MAX_ITEMS,
    isKo,
    "개",
    " items",
  );
  const aiGuest = formatEntitlementLimit(
    AI_DAILY_LIMITS.guest,
    isKo,
    "회/일",
    "/day",
  );
  const aiFree = formatEntitlementLimit(
    AI_DAILY_LIMITS.user,
    isKo,
    "회/일",
    "/day",
  );
  const aiPro = formatEntitlementLimit(
    AI_DAILY_LIMITS.pro,
    isKo,
    "회/일",
    "/day",
  );
  const favGuest = formatEntitlementLimit(
    FAVORITES_GUEST_MAX,
    isKo,
    "개",
    " items",
  );
  const pdfFreeTrial = formatEntitlementLimit(
    FREE_PLANNER_PDF_LIMIT,
    isKo,
    "회",
    " use(s)",
  );

  const plannerInput = isKo
    ? `플래너 조건 입력 (Step 1~${FREE_PLANNER_INPUT_LAST_STEP})`
    : `Planner input (steps 1–${FREE_PLANNER_INPUT_LAST_STEP})`;
  const plannerProOnly = isKo
    ? "플래너 결과·시뮬레이션·PDF는 PRO"
    : "Planner results, simulation & PDF — PRO";
  const mediaSpec = featureLabel("media_spec", isKo);

  return [
    {
      id: "free",
      features: [
        { id: "media_spec", text: mediaSpec },
        { id: "planner_input", text: plannerInput },
        { id: "planner_pro_gate", text: plannerProOnly },
        {
          id: "plan_cart",
          text: isKo
            ? `플랜·추천 카트 ${cartFree}`
            : `Plan / recommend cart — ${cartFree}`,
        },
        {
          id: "compare",
          text: isKo
            ? `매체 비교함 ${compareMax}`
            : `Media compare — ${compareMax}`,
        },
        {
          id: "favorites_guest",
          text: isKo
            ? `비회원 찜 ${favGuest} (로그인 시 제한 없음)`
            : `Guest favorites — ${favGuest} (unlimited when signed in)`,
        },
        {
          id: "ai_daily",
          text: isKo
            ? `AI 추천 ${aiFree} (로그인)`
            : `AI recommendations — ${aiFree} (signed in)`,
        },
        {
          id: "planner_pdf_trial",
          text: isKo
            ? `플래너 PDF 무료 체험 ${pdfFreeTrial}`
            : `Planner PDF trial — ${pdfFreeTrial}`,
        },
      ],
    },
    {
      id: "pro",
      features: [
        ...proFeatureBullets(isKo),
        {
          id: "plan_cart",
          text: isKo
            ? `플랜·추천 카트 ${cartPro}`
            : `Plan / recommend cart — ${cartPro}`,
        },
        {
          id: "compare",
          text: isKo
            ? `매체 비교함 ${compareMax}`
            : `Media compare — ${compareMax}`,
        },
        {
          id: "ai_daily",
          text: isKo ? `AI 추천 ${aiPro}` : `AI recommendations — ${aiPro}`,
        },
        {
          id: "ai_freetext",
          text: isKo ? "AI 자유입력 추천" : "AI free-text recommendations",
        },
      ],
    },
    {
      id: "enterprise",
      features: [
        {
          id: "api",
          text: featureLabel("api", isKo),
        },
        { id: "api_limits", text: apiLimitsSummary(isKo) },
        {
          id: "whitelabel",
          text: featureLabel("whitelabel", isKo),
          comingSoon: true,
        },
        {
          id: "dedicated_manager",
          text: isKo ? "전담 담당자" : "Dedicated account manager",
          comingSoon: true,
        },
        {
          id: "custom_reports",
          text: isKo ? "맞춤 데이터 리포트" : "Custom data reports",
          comingSoon: true,
        },
      ],
    },
  ];
}

/** 비회원 안내 — pricing 페이지 하단 footnote */
export function getPricingGuestFootnote(isKo: boolean): string {
  const aiGuest = formatEntitlementLimit(
    AI_DAILY_LIMITS.guest,
    isKo,
    "회/일",
    "/day",
  );
  const favGuest = formatEntitlementLimit(
    FAVORITES_GUEST_MAX,
    isKo,
    "개",
    " items",
  );
  const aiFree = formatEntitlementLimit(
    AI_DAILY_LIMITS.user,
    isKo,
    "회/일",
    "/day",
  );

  return isKo
    ? `비회원: AI ${aiGuest} · 찜 ${favGuest}. 로그인하면 FREE 혜택(AI ${aiFree} 등)이 적용됩니다.`
    : `Guests: AI ${aiGuest} · favorites ${favGuest}. Sign in for FREE benefits including AI ${aiFree}.`;
}
