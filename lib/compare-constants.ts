import { CART_COMPARE_MAX_FREE } from "@/lib/entitlements/constants";
import {
  cartCompareMaxItems,
  compareMaxItems,
  isCartCompareUnlimited,
} from "@/lib/entitlements/limits";

export {
  cartCompareMaxItems,
  compareMaxItems,
  isCartCompareUnlimited,
} from "@/lib/entitlements/limits";
export { CART_COMPARE_MAX_FREE } from "@/lib/entitlements/constants";

/**
 * @deprecated Use `compareMaxItems(isPro)` — FREE/guest 한도만 반영된 레거시 상수
 * (PRO UI는 반드시 `compareMaxItems(true)` 사용)
 */
export const COMPARE_MAX_ITEMS = CART_COMPARE_MAX_FREE;
