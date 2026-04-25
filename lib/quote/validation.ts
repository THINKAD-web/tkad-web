import { inclusiveCampaignDays } from "@/lib/pricing";
import {
  QUOTE_MAX_DAYS,
  QUOTE_MAX_MEDIA,
  QUOTE_MIN_DAYS,
  type QuoteWizardStep,
} from "@/lib/quote/types";
import {
  isoToDate,
  type QuoteStoreState,
} from "@/lib/quote/store";

/**
 * next-intl 메시지 키와 1:1 — 해당 키는 i18n 번들이 채워진 후 본 모듈로부터 끌어 쓰도록.
 * PR-3 부터 messages/ko.json·en.json 에 quote.errors.<key> 항목을 추가한다.
 */
export type QuoteErrorKey =
  | "needMediaPick"        // step 1: 매체 미선택
  | "tooManyMedia"         // step 1: 한도 초과(이론상 store 가 막지만 안전장치)
  | "needDates"            // step 2: 시작·종료일 누락
  | "endBeforeStart"       // step 2: 종료 < 시작
  | "campaignTooShort"     // step 2: < 7일
  | "campaignTooLong"      // step 2: > 365일
  | "needCreativeAsset"    // step 3: upload 모드인데 자료 없음
  | "needDesignBrief"      // step 3: design_request 모드인데 브리프 없음
  | "needCompany"          // step 4
  | "needName"
  | "needValidEmail"
  | "needValidPhone";

export type QuoteStepCheck =
  | { ok: true }
  | { ok: false; errorKey: QuoteErrorKey };

const PHONE_RE = /^[\d\-+() ]{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkStep1(state: QuoteStoreState): QuoteStepCheck {
  if (state.selectedMediaIds.length === 0) {
    return { ok: false, errorKey: "needMediaPick" };
  }
  if (state.selectedMediaIds.length > QUOTE_MAX_MEDIA) {
    return { ok: false, errorKey: "tooManyMedia" };
  }
  return { ok: true };
}

function checkStep2(state: QuoteStoreState): QuoteStepCheck {
  const start = isoToDate(state.startDateIso);
  const end = isoToDate(state.endDateIso);
  if (!start || !end) return { ok: false, errorKey: "needDates" };
  if (end < start) return { ok: false, errorKey: "endBeforeStart" };
  const days = inclusiveCampaignDays(start, end);
  if (days < QUOTE_MIN_DAYS) {
    return { ok: false, errorKey: "campaignTooShort" };
  }
  if (days > QUOTE_MAX_DAYS) {
    return { ok: false, errorKey: "campaignTooLong" };
  }
  return { ok: true };
}

function checkStep3(state: QuoteStoreState): QuoteStepCheck {
  switch (state.creativeMode) {
    case "upload":
      if (state.uploadedAssets.length === 0) {
        return { ok: false, errorKey: "needCreativeAsset" };
      }
      return { ok: true };
    case "design_request":
      if (!state.designBrief) {
        return { ok: false, errorKey: "needDesignBrief" };
      }
      return { ok: true };
    case "composite":
    case "later":
      return { ok: true };
  }
}

function checkStep4(state: QuoteStoreState): QuoteStepCheck {
  const c = state.customer;
  if (!c.company.trim()) return { ok: false, errorKey: "needCompany" };
  if (!c.name.trim()) return { ok: false, errorKey: "needName" };
  if (!EMAIL_RE.test(c.email.trim())) {
    return { ok: false, errorKey: "needValidEmail" };
  }
  if (!PHONE_RE.test(c.phone.trim())) {
    return { ok: false, errorKey: "needValidPhone" };
  }
  return { ok: true };
}

/**
 * 현재 단계에서 다음으로 이동 가능한지. step UI 의 "다음" 버튼이 본 함수를 호출.
 *
 * 4단계까지 통과 후 제출은 별도 API 검증을 거치므로(PR-9), 본 함수는 클라이언트 ergonomics
 * 만 다룬다.
 */
export function canProceedFromStep(
  state: QuoteStoreState,
  step: QuoteWizardStep,
): QuoteStepCheck {
  switch (step) {
    case 1:
      return checkStep1(state);
    case 2:
      return checkStep2(state);
    case 3:
      return checkStep3(state);
    case 4:
      return checkStep4(state);
    case 5:
    default:
      return { ok: true };
  }
}

/**
 * validator 가 통과시키는 최대 단계 — "이 상태로 어디까지 진행 가능한가" 판정용.
 * 주의: stepper UI 의 체크 표시는 별도 positional 로직(`currentStep > s`)을 사용한다.
 * 본 함수는 "복원된 draft 가 어떤 단계까지 점프 가능한가" 같은 판단에 쓴다.
 */
export function maxCompletedStep(state: QuoteStoreState): number {
  let completed = 0;
  for (const s of [1, 2, 3, 4] as const) {
    if (canProceedFromStep(state, s).ok) completed = s;
    else break;
  }
  return completed;
}
