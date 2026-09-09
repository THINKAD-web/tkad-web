"use client";

import { useReportCopyStore } from "@/lib/planner-report-export/report-copy-store";
import { usePlannerStore } from "@/lib/planner/store";

/**
 * 새 플랜 시작 시 제안서 제목·광고주명(report copy persist)을 비운다.
 * mix/brief 리셋은 `useBriefStore.reset()` 이 담당하고, 이 함수는 그 짝이다.
 */
export function resetPlannerReportCopy(): void {
  useReportCopyStore.getState().reset();
}

/** AI 플래너 레거시 persist(`tkad-planner-plan-v2`) 제목·광고주 필드 */
export function resetRecommendLegacyReportFields(): void {
  usePlannerStore.setState({
    reportClientName: "",
    reportDocumentTitle: "",
  });
}

/** AI/상세 플래너 공통 — report copy + 레거시 AI 필드 초기화 */
export function resetAllPlannerReportCopyFields(): void {
  resetPlannerReportCopy();
  resetRecommendLegacyReportFields();
}
