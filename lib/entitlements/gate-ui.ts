import { PRO_TRIAL_DAYS } from "@/lib/entitlements/constants";
import {
  FEATURE_MIN_LEVEL,
  rankLevel,
  type EntitlementAccessLevel,
  type ReportFeature,
} from "@/lib/entitlements/features";

/** UI 게이트 — feature 최소 레벨 대비 사용자 레벨 허용 여부 */
export function isFeatureAllowedAtLevel(
  feature: ReportFeature,
  userLevel: EntitlementAccessLevel,
): boolean {
  return rankLevel(userLevel) >= rankLevel(FEATURE_MIN_LEVEL[feature]);
}

export function plannerProGateTrialHint(isKo: boolean): string {
  return isKo
    ? `지금 가입하면 ${PRO_TRIAL_DAYS}일 무료`
    : `${PRO_TRIAL_DAYS}-day free trial on signup`;
}

export function plannerTrialBannerText(isKo: boolean): string {
  return isKo
    ? `✨ 지금 가입하면 상세 효과 시뮬레이션 ${PRO_TRIAL_DAYS}일 무료`
    : `✨ Sign up for ${PRO_TRIAL_DAYS} days of detailed effect simulation free`;
}
