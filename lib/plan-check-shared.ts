import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";
import type { EntitlementAccessLevel } from "@/lib/entitlements/features";
import { AGENCY_TEAM_SEATS } from "@/lib/entitlements/constants";

const MS_DAY = 24 * 60 * 60 * 1000;

export type PlanCheckUser = {
  plan: string;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  /** @deprecated legacy — prefer trialEndsAt + plan */
  proTrialEndsAt?: Date | string | null;
};

function trialStillValid(user: PlanCheckUser): boolean {
  if (user.plan !== "PRO_TRIAL") return false;
  const ends = user.trialEndsAt ?? user.proTrialEndsAt;
  if (!ends) return false;
  return Date.now() < new Date(ends).getTime();
}

/**
 * PRO급 기능 액세스 (카트 무제한·AI 30회 등).
 * LITE는 false — 플래너 결과/PDF는 FEATURE_MIN_LEVEL(LITE)로 별도 게이트.
 * AGENCY는 PRO와 동일 기능이므로 true.
 */
export function isPro(user: PlanCheckUser): boolean {
  if (user.plan === "PRO" || user.plan === "AGENCY" || user.plan === "ENTERPRISE") {
    return true;
  }
  if (trialStillValid(user)) return true;
  if (user.plan !== "PRO_TRIAL" && user.proTrialEndsAt) {
    return Date.now() < new Date(user.proTrialEndsAt).getTime();
  }
  return false;
}

/** LITE 이상 (LITE | PRO급) — 플래너 결과·PDF 등 */
export function isLiteOrAbove(user: PlanCheckUser): boolean {
  if (user.plan === "LITE") return true;
  return isPro(user);
}

export function isAgencyOrAbove(user: PlanCheckUser): boolean {
  return user.plan === "AGENCY" || user.plan === "ENTERPRISE";
}

/** User.plan → entitlement access level (feature gates) */
export function userPlanToAccessLevel(user: PlanCheckUser): EntitlementAccessLevel {
  if (user.plan === "ENTERPRISE") return "ENTERPRISE";
  if (isPro(user)) return "PRO";
  if (user.plan === "LITE") return "LITE";
  return "MEMBER";
}

/** 팀 좌석 상한 (본인 포함). AGENCY=5, ENTERPRISE=여유, 그 외=1 */
export function teamSeatLimitForPlan(plan: string): number {
  if (plan === "ENTERPRISE") return 50;
  if (plan === "AGENCY") return AGENCY_TEAM_SEATS;
  return 1;
}

export function trialDaysLeft(user: PlanCheckUser): number | null {
  if (user.plan !== "PRO_TRIAL") return null;
  const ends = user.trialEndsAt ?? user.proTrialEndsAt;
  if (!ends) return null;
  const ms = new Date(ends).getTime() - Date.now();
  if (ms <= 0) return 0;
  const days = Math.floor(ms / MS_DAY);
  return Math.min(PRO_TRIAL_DAYS, days);
}

export function trialProgressPct(user: PlanCheckUser): number {
  if (user.plan !== "PRO_TRIAL") return 0;
  const started = user.trialStartedAt
    ? new Date(user.trialStartedAt).getTime()
    : null;
  const ends = user.trialEndsAt ?? user.proTrialEndsAt;
  if (!ends) return 0;
  const endMs = new Date(ends).getTime();
  const startMs = started ?? endMs - PRO_TRIAL_DAYS * MS_DAY;
  const total = endMs - startMs;
  if (total <= 0) return 100;
  const elapsed = Date.now() - startMs;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
