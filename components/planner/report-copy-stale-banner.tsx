"use client";

import { RefreshCw } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";

/** 매체 구성 변경 시 — 사용자 편집 문구 보존, 재생성은 선택 */
export function ReportCopyStaleBanner({
  isKo,
  onRegenerate,
  onKeep,
}: {
  isKo: boolean;
  onRegenerate: () => void;
  onKeep: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
      role="status"
      data-testid="report-copy-stale-banner"
    >
      <p className="leading-snug">
        {isKo
          ? "매체 구성이 변경되었습니다. 인사말·요약을 다시 생성할까요? (직접 수정한 문구는 유지하려면 「그대로 유지」를 누르세요.)"
          : "The media mix changed. Regenerate the greeting and summary? Choose Keep to preserve your edits."}
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        <BtnBlock type="button" variant="secondary" size="sm" onClick={onKeep}>
          {isKo ? "그대로 유지" : "Keep"}
        </BtnBlock>
        <BtnBlock type="button" variant="primary" size="sm" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5" />
          {isKo ? "다시 생성" : "Regenerate"}
        </BtnBlock>
      </div>
    </div>
  );
}
