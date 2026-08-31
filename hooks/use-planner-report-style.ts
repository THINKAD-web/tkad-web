"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLANNER_REPORT_STYLE,
  parsePlannerReportStyle,
  type PlannerReportStyle,
} from "@/lib/planner-report-export/document-theme";

const STORAGE_KEY = "tkad:planner-report-style:v1";

export function readPlannerReportStyle(): PlannerReportStyle {
  if (typeof window === "undefined") return DEFAULT_PLANNER_REPORT_STYLE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return parsePlannerReportStyle(raw);
  } catch {
    return DEFAULT_PLANNER_REPORT_STYLE;
  }
}

export function writePlannerReportStyle(style: PlannerReportStyle): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, style);
  } catch {
    /* quota / private mode */
  }
}

export function usePlannerReportStyle(): [
  PlannerReportStyle,
  (next: PlannerReportStyle) => void,
] {
  const [style, setStyle] = useState<PlannerReportStyle>(
    DEFAULT_PLANNER_REPORT_STYLE,
  );

  useEffect(() => {
    setStyle(readPlannerReportStyle());
  }, []);

  const update = useCallback((next: PlannerReportStyle) => {
    setStyle(next);
    writePlannerReportStyle(next);
  }, []);

  return [style, update];
}
