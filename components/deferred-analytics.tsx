"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const WebVitalsReporter = dynamic(
  () =>
    import("@/components/web-vitals-reporter").then((m) => ({
      default: m.WebVitalsReporter,
    })),
  { ssr: false },
);

const OpsAnalyticsTracker = dynamic(
  () =>
    import("@/components/tracking/ops-analytics-tracker").then((m) => ({
      default: m.OpsAnalyticsTracker,
    })),
  { ssr: false },
);

function scheduleIdle(work: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(work, { timeout: 3000 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(work, 1500);
  return () => window.clearTimeout(t);
}

/** Defer non-critical analytics until the browser is idle. */
export function DeferredAnalytics() {
  const [ready, setReady] = useState(false);

  useEffect(() => scheduleIdle(() => setReady(true)), []);

  if (!ready) return null;

  return (
    <>
      <WebVitalsReporter />
      <OpsAnalyticsTracker />
    </>
  );
}
