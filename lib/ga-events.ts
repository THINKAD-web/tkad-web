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
  | "start_pro_trial"
  /** 매체 상세 견적 모달 오픈 (sticky / inline / feed) */
  | "quote_modal_open"
  /** 온라인 매체 견적 모달 → 문의하기 */
  | "online_modal_contact_click";

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
function cleanGaParams(
  params?: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  if (!params) return clean;
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;
  const clean = cleanGaParams(params);
  const gtag = window.gtag;
  if (typeof gtag === "function") {
    gtag("event", name, clean);
    return;
  }
  // GA 스크립트 로드 전에도 dataLayer에 적재 (gtm.js / gtag.js 부트스트랩)
  const dl = (window as Window & { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dl)) {
    dl.push({ event: name, ...clean });
  }
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

/** 플랜 카트(`tkad_plan_cart`) 담기/빼기 — planner store의 `add_to_plan` 과 별개 */
export function trackPlanCartUsage(params: CartUsageTrackParams): void {
  trackEvent(CART_USAGE_EVENT_PLAN, {
    media_id: params.media_id,
    source: params.source,
    added_from: params.source,
    action: params.action,
    media_name: params.media_name,
    cart_kind: "plan",
  });
}
