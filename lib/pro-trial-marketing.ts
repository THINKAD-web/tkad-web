import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";
import {
  AI_DAILY_LIMITS,
  FREE_PLANNER_INPUT_LAST_STEP,
  FREE_PLANNER_PDF_LIMIT,
} from "@/lib/entitlements/constants";
import { formatEntitlementLimit } from "@/lib/entitlements/gate-messages";

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

/** PRO 체험 종료 후 FREE 티어 한도 — pricing FREE 카드·가입 화면 공통 */
export function freeAfterProTrialNoteKo(): string {
  const pdf = formatEntitlementLimit(
    FREE_PLANNER_PDF_LIMIT,
    true,
    "회",
    " use(s)",
  );
  const ai = formatEntitlementLimit(
    AI_DAILY_LIMITS.user,
    true,
    "회/일",
    "/day",
  );
  return `체험 종료 후: 플래너 입력 Step 1~${FREE_PLANNER_INPUT_LAST_STEP}, PDF ${pdf}, AI추천 ${ai}로 전환`;
}

export function freeAfterProTrialNoteEn(): string {
  const pdf = formatEntitlementLimit(
    FREE_PLANNER_PDF_LIMIT,
    false,
    "회",
    " use(s)",
  );
  const ai = formatEntitlementLimit(
    AI_DAILY_LIMITS.user,
    false,
    "회/일",
    "/day",
  );
  return `After ${PRO_TRIAL_DAYS}-day trial: planner input steps 1–${FREE_PLANNER_INPUT_LAST_STEP}, PDF ${pdf}, AI ${ai}`;
}

export function freeAfterProTrialNote(isKo: boolean): string {
  return isKo ? freeAfterProTrialNoteKo() : freeAfterProTrialNoteEn();
}
