/** GA4 커스텀 이벤트 — gtag 로드 후 클라이언트에서만 호출 */

export type GaLaunchEvent =
  | "media_click"
  | "quote_submit"
  | "sign_up"
  | "planner_use"
  | "pdf_download";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
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
