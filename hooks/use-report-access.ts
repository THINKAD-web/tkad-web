"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";

const DEFAULT_DENIED: AccessCheckResult = {
  allowed: false,
  level: "FREE",
  reason: "login",
};

export function useReportAccess(feature: ReportFeature) {
  const [access, setAccess] = useState<AccessCheckResult>(DEFAULT_DENIED);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/report-access?feature=${encodeURIComponent(feature)}`,
        { credentials: "include" },
      );
      if (res.ok) {
        setAccess((await res.json()) as AccessCheckResult);
      } else {
        setAccess(DEFAULT_DENIED);
      }
    } catch {
      setAccess(DEFAULT_DENIED);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { access, loading, refresh };
}
