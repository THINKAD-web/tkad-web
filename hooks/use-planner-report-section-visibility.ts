"use client";

import { useCallback, useEffect, useState } from "react";
import {
  defaultPlannerReportSectionVisibility,
  readPlannerReportSectionVisibility,
  type PlannerReportSectionKey,
  writePlannerReportSectionVisibility,
} from "@/lib/planner-report-export/section-visibility";

export function usePlannerReportSectionVisibility(): [
  Record<PlannerReportSectionKey, boolean>,
  (next: Record<PlannerReportSectionKey, boolean>) => void,
] {
  const [visibility, setVisibility] = useState(defaultPlannerReportSectionVisibility);

  useEffect(() => {
    setVisibility(readPlannerReportSectionVisibility());
  }, []);

  const update = useCallback((next: Record<PlannerReportSectionKey, boolean>) => {
    setVisibility(next);
    writePlannerReportSectionVisibility(next);
  }, []);

  return [visibility, update];
}
