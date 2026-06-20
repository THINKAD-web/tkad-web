import {
  CART_COMPARE_MAX_FREE,
  PLAN_CART_UNLIMITED,
} from "@/lib/entitlements/constants";

/** 비회원·FREE vs PRO — 내 플랜·비교 카트 최대 개수 */
export function cartCompareMaxItems(isPro: boolean): number {
  return isPro ? PLAN_CART_UNLIMITED : CART_COMPARE_MAX_FREE;
}

/** @deprecated alias — `cartCompareMaxItems` */
export const planCartMaxItems = cartCompareMaxItems;

/** @deprecated alias — `cartCompareMaxItems` */
export const compareMaxItems = cartCompareMaxItems;

export function cartCompareLimitToastMessage(isKo: boolean): string {
  return isKo
    ? `최대 ${CART_COMPARE_MAX_FREE}개까지 담을 수 있어요. PRO로 업그레이드하면 무제한입니다.`
    : `Up to ${CART_COMPARE_MAX_FREE} items. Upgrade to PRO for unlimited.`;
}

export function isCartCompareUnlimited(maxItems: number): boolean {
  return maxItems >= 1000;
}
