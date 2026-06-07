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
