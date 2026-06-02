import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";

/** 신규 가입 시 부여되는 PRO 체험 — `grantProTrialOnSignup` / `PRO_TRIAL_DAYS` 와 동기화 */
export function proTrialSignupHeadlineKo(): string {
  return `신규 가입 시 PRO ${PRO_TRIAL_DAYS}일 무료`;
}

export function proTrialSignupHeadlineEn(): string {
  return `${PRO_TRIAL_DAYS}-day PRO free on signup`;
}

export function proTrialSignupSubKo(): string {
  return `가입 즉시 PDF·시뮬레이션·고급 분석을 ${PRO_TRIAL_DAYS}일간 이용`;
}

export function proTrialSignupSubEn(): string {
  return `PDF, simulation & advanced analytics for ${PRO_TRIAL_DAYS} days after signup`;
}
