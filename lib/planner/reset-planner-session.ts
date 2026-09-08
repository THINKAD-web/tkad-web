"use client";

import { useReportCopyStore } from "@/lib/planner-report-export/report-copy-store";

/**
 * 새 플랜 시작 시 제안서 제목·광고주명(report copy persist)을 비운다.
 * mix/brief 리셋은 `useBriefStore.reset()` 이 담당하고, 이 함수는 그 짝이다.
 */
export function resetPlannerReportCopy(): void {
  useReportCopyStore.getState().reset();
}
