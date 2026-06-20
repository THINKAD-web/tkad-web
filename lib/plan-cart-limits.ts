import {
  CART_COMPARE_MAX_FREE,
  PLAN_CART_UNLIMITED,
} from "@/lib/entitlements/constants";
import {
  cartCompareMaxItems,
  cartCompareLimitToastMessage,
  isCartCompareUnlimited,
} from "@/lib/entitlements/limits";

export {
  CART_COMPARE_MAX_FREE,
  PLAN_CART_UNLIMITED,
} from "@/lib/entitlements/constants";
export {
  cartCompareMaxItems,
  cartCompareLimitToastMessage,
  isCartCompareUnlimited,
  planCartMaxItems,
  compareMaxItems,
} from "@/lib/entitlements/limits";

export const PLAN_CART_MAX_ITEMS_FREE = CART_COMPARE_MAX_FREE;
export const PLAN_CART_MAX_ITEMS_PRO = PLAN_CART_UNLIMITED;

/** @deprecated FREE 한도 — 서버·레거시 호환용 */
export const PLAN_CART_MAX_ITEMS = CART_COMPARE_MAX_FREE;

/** UI: 무제한이면 `12개`, 한도 있으면 `12/30` */
export function formatPlanCartCountLabel(
  count: number,
  max: number,
  isKo: boolean,
): string {
  if (isCartCompareUnlimited(max)) {
    return isKo ? `${count}개` : `${count}`;
  }
  return isKo ? `${count}/${max}개` : `${count}/${max}`;
}

/** 하단 바·탭 배지 — 실제 개수 표시 (99 초과만 `99+`) */
export function formatPlanCartBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}
