import {
  FEATURE_MIN_LEVEL,
  type EntitlementAccessLevel,
  type ReportFeature,
} from "@/lib/entitlements/features";

/** API·토스트용 — feature 최소 등급과 HTTP 상태에 맞는 거부 메시지 */
export function accessDeniedErrorMessage(
  feature: ReportFeature,
  status: 401 | 403,
  isKo = false,
): string {
  if (status === 401) {
    return isKo ? "로그인이 필요합니다." : "Login required";
  }
  const min = FEATURE_MIN_LEVEL[feature];
  return upgradeRequiredMessage(min, isKo);
}

export function upgradeRequiredMessage(
  min: EntitlementAccessLevel,
  isKo: boolean,
): string {
  if (min === "MEMBER") {
    return isKo ? "회원 가입이 필요합니다." : "Sign-up required";
  }
  if (min === "LITE") {
    return isKo ? "LITE 이상 필요" : "LITE or higher required";
  }
  if (min === "PRO") {
    return isKo ? "PRO 구독 필요" : "PRO subscription required";
  }
  return isKo ? "Enterprise 문의 필요" : "Enterprise required";
}

/** UI 게이트 — LITE vs PRO 경계를 명시 */
export function featureGateHint(
  feature: ReportFeature,
  isKo: boolean,
  extras?: { proAddon?: string },
): string {
  const min = FEATURE_MIN_LEVEL[feature];
  if (min === "LITE") {
    return isKo
      ? "로그인·LITE 이상 구독 후 이용할 수 있습니다."
      : "Sign in with LITE or higher to unlock this.";
  }
  if (min === "PRO") {
    const addon = extras?.proAddon;
    return isKo
      ? `로그인·PRO 구독 후 이용할 수 있습니다.${addon ? ` (${addon})` : ""}`
      : `Sign in with PRO to unlock this.${addon ? ` (${addon})` : ""}`;
  }
  return upgradeRequiredMessage(min, isKo);
}

/** 플래너 Step3 — LITE 기능(제안서·견적표·이메일) */
export function plannerProposalGateHint(isKo: boolean): string {
  return isKo
    ? "로그인·LITE 이상 구독 후 제안서 미리보기·편집·견적표·이메일 발송을 사용할 수 있습니다."
    : "Sign in with LITE or higher to preview, edit, email proposals, and view the quote table.";
}

/** 플래너 결과·PDF — LITE; 시뮬레이션은 PRO */
export function plannerResultGateHint(isKo: boolean): string {
  return isKo
    ? "로그인·LITE 이상 구독 후 전체 보고서와 PDF를 확인할 수 있습니다. (효과 시뮬레이션은 PRO)"
    : "Sign in with LITE or higher for the full report and PDF. (Simulation requires PRO)";
}

/** LITE 플랜 카드 — PRO-only 기능 안내 */
export function litePlanProAddonNote(isKo: boolean): string {
  return isKo
    ? "AI 시뮬레이션·경쟁 분석·마켓 인사이트는 PRO"
    : "AI simulation, competitor analysis & market insights — PRO";
}
