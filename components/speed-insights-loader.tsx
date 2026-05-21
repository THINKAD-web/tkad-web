"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

/** Vercel Speed Insights — 프로덕션 트래픽 RUM */
export function SpeedInsightsLoader() {
  return <SpeedInsights />;
}
