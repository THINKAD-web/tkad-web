"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readPlanCartReportRequestBudgetOverride,
  writePlanCartReportRequestBudgetOverride,
} from "@/lib/plan-cart-report/request-budget-override";

export function usePlanCartReportRequestBudgetOverride(cartUpdatedAt?: string): {
  overrideMan: number | null;
  setOverrideMan: (man: number | null) => void;
  clearOverride: () => void;
} {
  const [overrideMan, setOverrideManState] = useState<number | null>(null);

  useEffect(() => {
    const stored = readPlanCartReportRequestBudgetOverride(cartUpdatedAt);
    setOverrideManState(stored?.requestedBudgetMan ?? null);
  }, [cartUpdatedAt]);

  const setOverrideMan = useCallback(
    (man: number | null) => {
      setOverrideManState(man);
      if (man == null || man <= 0 || !cartUpdatedAt) {
        writePlanCartReportRequestBudgetOverride(null);
        return;
      }
      writePlanCartReportRequestBudgetOverride({
        requestedBudgetMan: Math.round(man),
        cartUpdatedAt,
      });
    },
    [cartUpdatedAt],
  );

  const clearOverride = useCallback(() => {
    setOverrideMan(null);
  }, [setOverrideMan]);

  return { overrideMan, setOverrideMan, clearOverride };
}
