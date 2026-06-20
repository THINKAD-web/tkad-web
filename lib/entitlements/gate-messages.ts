import { featureLabel } from "@/lib/report-access-shared";
import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
import {
  AI_DAILY_LIMITS,
  FAVORITES_GUEST_MAX,
  PRO_TRIAL_DAYS,
} from "@/lib/entitlements/constants";
import {
  FEATURE_MIN_LEVEL,
  type EntitlementAccessLevel,
} from "@/lib/entitlements/features";
import { isFeatureAllowedAtLevel } from "@/lib/entitlements/gate-ui";
import {
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
} from "@/lib/plan-cart-limits";

export type TierGateCta = {
  href: string;
  label: string;
};

/** Overlay·토스트 공통 — entitlements 기반 등급 안내 */
export type TierGateMessage = {
  eyebrow: string;
  title: string;
  description: string;
  hint?: string;
  primaryCta: TierGateCta;
  secondaryCta?: TierGateCta;
};

function isUnlimitedCount(n: number): boolean {
  return n >= Number.MAX_SAFE_INTEGER / 2;
}

export function formatEntitlementLimit(
  n: number,
  isKo: boolean,
  unitKo: string,
  unitEn: string,
): string {
  if (isUnlimitedCount(n)) {
    return isKo ? "무제한" : "Unlimited";
  }
  return isKo
    ? `${n.toLocaleString("ko-KR")}${unitKo}`
    : `${n.toLocaleString("en-US")}${unitEn}`;
}

function requiredTierEyebrow(minLevel: EntitlementAccessLevel, isKo: boolean): string {
  if (minLevel === "MEMBER") {
    return isKo ? "FREE 회원" : "FREE member";
  }
  if (minLevel === "PRO") return "PRO";
  return "Enterprise";
}

function aiDailyLimitsLine(isKo: boolean): string {
  const g = formatEntitlementLimit(AI_DAILY_LIMITS.guest, isKo, "회/일", "/day");
  const u = formatEntitlementLimit(AI_DAILY_LIMITS.user, isKo, "회/일", "/day");
  const p = formatEntitlementLimit(AI_DAILY_LIMITS.pro, isKo, "회/일", "/day");
  return isKo
    ? `AI 추천: 비회원 ${g} → 로그인 ${u} → PRO ${p}`
    : `AI: guest ${g} → signed-in ${u} → PRO ${p}`;
}

function proUnlocksHint(feature: ReportFeature, isKo: boolean): string | undefined {
  const min = FEATURE_MIN_LEVEL[feature];
  if (min !== "PRO") return undefined;
  return isKo
    ? `PRO에서 ${featureLabel(feature, true)}·노출 예측·시뮬레이션·PDF 보고서를 이용할 수 있어요.`
    : `PRO unlocks ${featureLabel(feature, false)}, forecasts, simulation & PDF reports.`;
}

/**
 * 기능 게이트 — FEATURE_MIN_LEVEL · access.reason · featureLabel 단일 소스.
 * matrix.ts 와 동일한 isFeatureAllowedAtLevel / constants 사용.
 */
export function buildFeatureGateMessage(opts: {
  feature: ReportFeature;
  access: AccessCheckResult;
  isKo: boolean;
}): TierGateMessage {
  const { feature, access, isKo } = opts;
  const minLevel = FEATURE_MIN_LEVEL[feature];
  const title = featureLabel(feature, isKo);
  const eyebrow = requiredTierEyebrow(minLevel, isKo);
  const trialHint = isKo
    ? `지금 가입하면 ${PRO_TRIAL_DAYS}일 PRO 무료 체험`
    : `${PRO_TRIAL_DAYS}-day PRO free trial on signup`;

  if (access.reason === "login") {
    const needsPro = minLevel === "PRO" || minLevel === "ENTERPRISE";
    return {
      eyebrow: isKo ? "등급 안내" : "Plan info",
      title: needsPro
        ? isKo
          ? `${title} — PRO 전용`
          : `${title} — PRO only`
        : title,
      description: needsPro
        ? isKo
          ? `로그인하면 FREE로 기본 기능을 이용할 수 있어요. ${title} 기능은 PRO에서 열립니다. ${aiDailyLimitsLine(true)}`
          : `Sign in for FREE basics. ${title} requires PRO. ${aiDailyLimitsLine(false)}`
        : isKo
          ? `로그인하면 FREE 회원으로 ${title} 기능을 확인할 수 있어요.`
          : `Sign in as a FREE member to access ${title}.`,
      hint: needsPro ? trialHint : undefined,
      primaryCta: {
        href: "/login",
        label: isKo ? "로그인" : "Sign in",
      },
      secondaryCta: needsPro
        ? {
            href: "/pricing",
            label: isKo ? "PRO 안내" : "View PRO",
          }
        : undefined,
    };
  }

  if (access.reason === "enterprise") {
    return {
      eyebrow: "Enterprise",
      title,
      description: isKo
        ? `${title} 기능은 Enterprise 플랜 전용이에요.`
        : `${title} is available on the Enterprise plan.`,
      primaryCta: {
        href: "/pricing",
        label: isKo ? "플랜 문의" : "Contact sales",
      },
    };
  }

  if (access.reason === "trial_expired") {
    return {
      eyebrow: "PRO",
      title,
      description: isKo
        ? `PRO 체험이 종료되어 ${title} 기능을 이용할 수 없어요.`
        : `Your PRO trial has ended — ${title} is locked.`,
      hint: proUnlocksHint(feature, isKo),
      primaryCta: {
        href: "/pricing",
        label: isKo ? "PRO 구독하기" : "Subscribe to PRO",
      },
    };
  }

  // upgrade (logged-in FREE / below min)
  return {
    eyebrow: "PRO",
    title: isKo ? `${title} — PRO 전용` : `${title} — PRO only`,
    description:
      isKo
        ? `이 기능은 PRO 전용이에요. FREE에서는 플래너 입력(Step 1~6)까지 가능합니다.`
        : `This feature requires PRO. FREE includes planner input through Step 6.`,
    hint: proUnlocksHint(feature, isKo) ?? trialHint,
    primaryCta: {
      href: "/pricing",
      label: isKo ? "PRO 무료 체험" : "Start PRO trial",
    },
    secondaryCta: {
      href: "/pricing?trial=1",
      label: isKo ? "플랜 비교" : "Compare plans",
    },
  };
}

export type AiRateReason = "guest_limit" | "user_limit" | "abuse";

export function buildAiLimitMessage(
  reason: AiRateReason | undefined,
  isKo: boolean,
): TierGateMessage {
  const guest = formatEntitlementLimit(AI_DAILY_LIMITS.guest, isKo, "회/일", "/day");
  const user = formatEntitlementLimit(AI_DAILY_LIMITS.user, isKo, "회/일", "/day");
  const pro = formatEntitlementLimit(AI_DAILY_LIMITS.pro, isKo, "회/일", "/day");

  if (reason === "guest_limit") {
    return {
      eyebrow: isKo ? "일일 한도" : "Daily limit",
      title: isKo ? "오늘 AI 이용 한도에 도달했어요" : "Daily AI limit reached",
      description: isKo
        ? `비회원은 ${guest}까지 이용할 수 있어요. 로그인하면 ${user}, PRO는 ${pro}까지 이용 가능합니다.`
        : `Guests get ${guest}. Sign in for ${user}; PRO gets ${pro}.`,
      primaryCta: {
        href: "/login",
        label: isKo ? "로그인" : "Sign in",
      },
      secondaryCta: {
        href: "/pricing",
        label: isKo ? "PRO 안내" : "View PRO",
      },
    };
  }

  if (reason === "user_limit") {
    return {
      eyebrow: isKo ? "일일 한도" : "Daily limit",
      title: isKo ? "오늘 AI 이용 한도에 도달했어요" : "Daily AI limit reached",
      description: isKo
        ? `FREE 회원은 ${user}까지 이용할 수 있어요. PRO는 ${pro}까지 이용 가능합니다.`
        : `FREE members get ${user}. PRO gets ${pro}.`,
      primaryCta: {
        href: "/pricing",
        label: isKo ? "PRO 업그레이드" : "Upgrade to PRO",
      },
      secondaryCta: {
        href: "/contact",
        label: isKo ? "전문가 상담" : "Talk to an expert",
      },
    };
  }

  return {
    eyebrow: isKo ? "잠시만요" : "Please wait",
    title: isKo ? "잠시 후 다시 시도해주세요" : "Please try again shortly",
    description: isKo
      ? "짧은 시간에 너무 많은 요청이 있었어요. 이는 오류가 아니라 이용 한도 안내입니다."
      : "Too many requests in a short time — this is a usage limit, not an error.",
    primaryCta: {
      href: "/guide/how-to-use",
      label: isKo ? "이용 안내" : "How to use",
    },
  };
}

/** API·토스트용 한 줄 요약 */
export function aiRateMessage(reason: AiRateReason | undefined, isKo: boolean): string {
  return buildAiLimitMessage(reason, isKo).description;
}

export function buildPlanCartLimitMessage(isKo: boolean, isPro: boolean): string {
  const freeMax = PLAN_CART_MAX_ITEMS_FREE;
  const proMax = PLAN_CART_MAX_ITEMS_PRO;

  if (isUnlimitedCount(freeMax) && isUnlimitedCount(proMax)) {
    return isKo
      ? "플랜 카트에 더 담을 수 없어요. (현재 등급별 상한 없음 — 운영팀에 문의해 주세요.)"
      : "Cannot add more to your plan cart. (No tier cap configured — contact support.)";
  }

  const freeLabel = formatEntitlementLimit(freeMax, isKo, "개", " items");
  const proLabel = formatEntitlementLimit(proMax, isKo, "개", " items");

  if (isPro) {
    return isKo
      ? `PRO 플랜 카트는 ${proLabel}까지 담을 수 있어요.`
      : `PRO plan cart holds up to ${proLabel}.`;
  }

  return isKo
    ? `FREE는 플랜 카트 ${freeLabel}까지, PRO는 ${proLabel}까지 담을 수 있어요.`
    : `FREE plan cart: ${freeLabel}. PRO: ${proLabel}.`;
}

export function buildFavoritesGuestLimitMessage(isKo: boolean): string {
  const max = formatEntitlementLimit(FAVORITES_GUEST_MAX, isKo, "개", " items");
  return isKo
    ? `비회원 찜은 ${max}까지 저장할 수 있어요. 로그인하면 제한 없이 이용할 수 있습니다.`
    : `Guests can save up to ${max} favorites. Sign in for unlimited favorites.`;
}

/** @deprecated 토스트·API — buildAiLimitMessage.description 과 동일 */
export function tierGateMessageToText(msg: TierGateMessage): string {
  return [msg.description, msg.hint].filter(Boolean).join(" ");
}

/** matrix 검증용 — 사용자 레벨에서 기능 허용 여부 */
export { isFeatureAllowedAtLevel };
