/** notes 에 심는 식별자 — cron 만료·lazy filter·디버그에 사용 */
export const INSTANT_PAYMENT_HOLD_MARKER = "[instant-payment-hold]";

/** 결제 대기 홀드 TTL (분) */
export const INSTANT_HOLD_TTL_MINUTES = 30;

export const INSTANT_PAYMENT_HOLD_TTL_MS = INSTANT_HOLD_TTL_MINUTES * 60_000;
