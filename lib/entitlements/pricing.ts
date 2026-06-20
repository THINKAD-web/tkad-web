import { PRO_MONTHLY_KRW, PRO_TRIAL_DAYS } from "@/lib/entitlements/constants";

/**
 * PRO 월 구독 상시 할인율 (0 = 할인 없음, 20 = 20% 할인).
 * 이 값만 변경하면 가격표·결제·문구가 함께 반영됩니다.
 */
export const PRO_DISCOUNT_PERCENT = 0;

export type ProPriceDisplay = {
  listPriceKrw: number;
  salePriceKrw: number;
  discountPercent: number;
  hasDiscount: boolean;
};

/** 정수 원 — Toss 청구·DB 저장용 */
export function discountedProPriceKrw(
  percent: number = PRO_DISCOUNT_PERCENT,
): number {
  if (percent <= 0) return PRO_MONTHLY_KRW;
  const raw = PRO_MONTHLY_KRW * (1 - percent / 100);
  return Math.round(raw);
}

export function getProPriceDisplay(
  percent: number = PRO_DISCOUNT_PERCENT,
): ProPriceDisplay {
  const discountPercent = Math.max(0, Math.min(100, Math.floor(percent)));
  const hasDiscount = discountPercent > 0;
  const salePriceKrw = discountedProPriceKrw(discountPercent);
  return {
    listPriceKrw: PRO_MONTHLY_KRW,
    salePriceKrw,
    discountPercent,
    hasDiscount,
  };
}

export function formatProMonthlyPriceKo(
  display: ProPriceDisplay = getProPriceDisplay(),
): string {
  return `월 ₩${display.salePriceKrw.toLocaleString("ko-KR")}`;
}

export function formatProMonthlyPriceEn(
  display: ProPriceDisplay = getProPriceDisplay(),
): string {
  return `₩${display.salePriceKrw.toLocaleString("en-US")}/mo`;
}

export function formatProCardPriceLabel(isKo: boolean): string {
  const d = getProPriceDisplay();
  if (isKo) {
    return `카드 ₩${d.salePriceKrw.toLocaleString("ko-KR")}/월`;
  }
  return `Card ₩${d.salePriceKrw.toLocaleString("en-US")}/mo`;
}

export function proPriceFaqAnswerKo(): string {
  const d = getProPriceDisplay();
  const price = `월 ${d.salePriceKrw.toLocaleString("ko-KR")}원`;
  const discountNote = d.hasDiscount
    ? ` (정가 ${d.listPriceKrw.toLocaleString("ko-KR")}원, ${d.discountPercent}% 할인)`
    : "";
  return `${price}${discountNote}이며, 포인트로도 이용 가능합니다. 지금 가입하면 ${PRO_TRIAL_DAYS}일 무료 체험이 제공됩니다.`;
}

export function proPriceFaqAnswerEn(): string {
  const d = getProPriceDisplay();
  const price = `₩${d.salePriceKrw.toLocaleString("en-US")}/month`;
  const discountNote = d.hasDiscount
    ? ` (was ₩${d.listPriceKrw.toLocaleString("en-US")}, ${d.discountPercent}% off)`
    : "";
  return `${price}${discountNote}, or redeem with points. New signups get a ${PRO_TRIAL_DAYS}-day free trial.`;
}
