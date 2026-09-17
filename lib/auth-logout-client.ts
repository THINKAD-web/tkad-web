import { resetPlanCartOnAuthLogout } from "@/lib/plan-cart-session-owner";

/** 공개 사이트 로그아웃 — 다른 계정으로 카트가 넘어가지 않도록 로컬 플랜 카트 제거 */
export async function performUserLogout(redirectHref: string): Promise<void> {
  resetPlanCartOnAuthLogout();
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  window.location.href = redirectHref;
}
