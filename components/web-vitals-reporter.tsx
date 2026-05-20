"use client";

import { useReportWebVitals } from "next/web-vitals";

function sendVital(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/vitals",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    /* sampling 실패는 무시 */
  }
}

/** Core Web Vitals → POST /api/vitals */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (typeof window === "undefined") return;
    const locale =
      document.documentElement.lang ||
      window.location.pathname.split("/").filter(Boolean)[0] ||
      "ko";

    sendVital({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: window.location.pathname,
      locale,
      navigationType: metric.navigationType,
      id: metric.id,
    });
  });

  return null;
}
