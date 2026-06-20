"use client";

import { useMemo } from "react";
import type { AccessCheckResult, ReportFeature } from "@/lib/report-access-shared";
import { useReportAccess } from "@/hooks/use-report-access";

/**
 * UI 게이트 — 서버 `checkReportAccess` / `FEATURE_MIN_LEVEL` 과 동일 소스.
 * `loading` 동안 `allowed` 는 false 이지만 `pending` 으로 게이트 UI 억제.
 */
export function useFeatureAccess(feature: ReportFeature) {
  const { access, loading, refresh } = useReportAccess(feature);

  return useMemo(
    () => ({
      access,
      loading,
      refresh,
      pending: loading,
      allowed: access.allowed,
      /** 로딩 끝난 뒤에만 게이트(블러·CTA) 표시 */
      showGate: !loading && !access.allowed,
    }),
    [access, loading, refresh],
  );
}

/** @deprecated alias — `useFeatureAccess("planner_result")` */
export function usePlannerResultAccess() {
  return useFeatureAccess("planner_result");
}

export type FeatureAccessState = {
  access: AccessCheckResult;
  loading: boolean;
  pending: boolean;
  allowed: boolean;
  showGate: boolean;
  refresh: () => Promise<void>;
};
