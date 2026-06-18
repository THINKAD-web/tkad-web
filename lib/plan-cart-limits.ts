/** 내 플랜·추천 카트 공통 용량 (PRO 등급별) */
export const PLAN_CART_MAX_ITEMS_FREE = 10;
export const PLAN_CART_MAX_ITEMS_PRO = 30;

/** @deprecated FREE 한도 — 서버·레거시 호환용 */
export const PLAN_CART_MAX_ITEMS = PLAN_CART_MAX_ITEMS_FREE;

export function planCartMaxItems(isPro: boolean): number {
  return isPro ? PLAN_CART_MAX_ITEMS_PRO : PLAN_CART_MAX_ITEMS_FREE;
}
