import {
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
  PLAN_CART_UNLIMITED,
} from "@/lib/entitlements/constants";

export {
  PLAN_CART_MAX_ITEMS_FREE,
  PLAN_CART_MAX_ITEMS_PRO,
  PLAN_CART_UNLIMITED,
} from "@/lib/entitlements/constants";

/** @deprecated FREE 한도 — 서버·레거시 호환용 */
export const PLAN_CART_MAX_ITEMS = PLAN_CART_MAX_ITEMS_FREE;

export function planCartMaxItems(isPro?: boolean): number {
  return isPro ? PLAN_CART_MAX_ITEMS_PRO : PLAN_CART_MAX_ITEMS_FREE;
}

/** UI: 무제한이면 `12개`, 한도 있으면 `12/30` */
export function formatPlanCartCountLabel(
  count: number,
  max: number,
  isKo: boolean,
): string {
  if (max >= 1000) {
    return isKo ? `${count}개` : `${count}`;
  }
  return isKo ? `${count}/${max}개` : `${count}/${max}`;
}

/** 하단 바·탭 배지 — 실제 개수 표시 (99 초과만 `99+`) */
export function formatPlanCartBadgeCount(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}
