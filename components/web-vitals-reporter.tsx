"use client";

import { useEffect } from "react";
import type { LCPMetricWithAttribution, Metric } from "web-vitals";

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

function localeFromDocument(): string {
  return (
    document.documentElement.lang ||
    window.location.pathname.split("/").filter(Boolean)[0] ||
    "ko"
  );
}

function reportStandardMetric(metric: Metric) {
  sendVital({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
    locale: localeFromDocument(),
    navigationType: metric.navigationType,
    id: metric.id,
  });
}

function reportLcpMetric(metric: LCPMetricWithAttribution) {
  const attr = metric.attribution;
  sendVital({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    path: window.location.pathname,
    locale: localeFromDocument(),
    navigationType: metric.navigationType,
    id: metric.id,
    lcpElement: attr?.element ?? undefined,
    lcpUrl: attr?.url ?? undefined,
    lcpTtfbMs: attr?.timeToFirstByte,
    lcpResourceLoadDelayMs: attr?.resourceLoadDelay,
  });
}

/** Core Web Vitals → POST /api/vitals (LCP uses attribution build). */
export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false;

    void import("web-vitals/attribution").then(
      ({ onCLS, onFCP, onINP, onTTFB, onLCP }) => {
        if (cancelled) return;
        onCLS(reportStandardMetric);
        onFCP(reportStandardMetric);
        onINP(reportStandardMetric);
        onTTFB(reportStandardMetric);
        onLCP(reportLcpMetric);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
