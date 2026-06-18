"use client";

import type { PlanReportActivityInput } from "@/lib/plan-report-activity/types";

export async function trackPlanReportActivity(
  input: PlanReportActivityInput,
): Promise<void> {
  try {
    await fetch("/api/my/plan/report/activity", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    /* non-blocking */
  }
}
