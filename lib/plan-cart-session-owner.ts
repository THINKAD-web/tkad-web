/** 로컬 `tkad_plan_cart` 가 마지막으로 동기화된 로그인 사용자 (계정 전환 격리) */

import {
  PLAN_CART_CHANGE_EVENT,
  PLAN_CART_KEY,
  type PlanCart,
} from "@/lib/plan-cart";
import { resetPlanCartLocalGuard } from "@/lib/plan-cart-local-guard";

export const PLAN_CART_BOUND_USER_KEY = "tkad_plan_cart_bound_user_id";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getPlanCartBoundUserId(): string | null {
  if (!isBrowser()) return null;
  const v = window.localStorage.getItem(PLAN_CART_BOUND_USER_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function setPlanCartBoundUserId(userId: string | null): void {
  if (!isBrowser()) return;
  if (!userId?.trim()) {
    window.localStorage.removeItem(PLAN_CART_BOUND_USER_KEY);
    return;
  }
  window.localStorage.setItem(PLAN_CART_BOUND_USER_KEY, userId.trim());
}

/** 다른 로그인 사용자로 바뀐 경우 — 로컬 카트를 새 사용자 서버에 push 하면 안 됨 */
export function isPlanCartAccountSwitch(
  boundUserId: string | null,
  nextUserId: string,
): boolean {
  if (!boundUserId) return false;
  return boundUserId !== nextUserId;
}

/** 로그아웃·세션 종료 시 로컬 카트·소유자 표시 제거 */
export function resetPlanCartOnAuthLogout(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PLAN_CART_KEY);
  setPlanCartBoundUserId(null);
  resetPlanCartLocalGuard();
  const empty: PlanCart = { items: [], updatedAt: "" };
  window.dispatchEvent(
    new CustomEvent(PLAN_CART_CHANGE_EVENT, { detail: empty }),
  );
}

/** 디버그·E2E — 카트 키 존재 여부 */
export function hasPlanCartInStorage(): boolean {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(PLAN_CART_KEY) != null;
}
