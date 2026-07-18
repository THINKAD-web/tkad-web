/** GA4 커스텀 이벤트 — gtag 로드 후 클라이언트에서만 호출 */

export type GaLaunchEvent =
  | "media_click"
  | "quote_submit"
  | "sign_up"
  | "planner_use"
  | "pdf_download"
  // ── 핵심 전환 이벤트 ──
  | "view_media"
  | "add_to_plan"
  | "start_planner"
  | "complete_quote"
  | "submit_contact"
  | "use_chatbot"
  | "download_proposal"
  | "signup"
  | "start_pro_trial";

/** useCart(레거시 견적함) vs usePlanCart(플랜 카트) 비교용 — 파라미터 스키마 통일 */
export const CART_USAGE_EVENT_LEGACY = "add_to_cart_legacy";
export const CART_USAGE_EVENT_PLAN = "add_to_plan_cart";

export type CartUsageTrackParams = {
  media_id: string;
  /** UI·진입 경로 (예: media_detail, search, map, ai_recommend) */
  source: string;
  action: "add" | "remove";
  media_name?: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** 임의 이름 GA4 이벤트(타입 자유). 신규 전환 추적용. */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  gtag("event", name, clean);
}

export function trackGaEvent(
  name: GaLaunchEvent,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;
  const gtag = window.gtag;
  if (typeof gtag !== "function") return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  gtag("event", name, clean);
}

/** 레거시 견적함(`tkad-media-cart-v1`) 담기/빼기 */
export function trackLegacyCartUsage(params: CartUsageTrackParams): void {
  trackEvent(CART_USAGE_EVENT_LEGACY, {
    media_id: params.media_id,
    source: params.source,
    action: params.action,
    media_name: params.media_name,
    cart_kind: "legacy",
  });
}

/** 플랜 카트(`tkad_plan_cart`) 담기/빼기 — planner store의 `add_to_plan` 과 별개 */
export function trackPlanCartUsage(params: CartUsageTrackParams): void {
  trackEvent(CART_USAGE_EVENT_PLAN, {
    media_id: params.media_id,
    source: params.source,
    action: params.action,
    media_name: params.media_name,
    cart_kind: "plan",
  });
}
