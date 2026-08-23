"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  buildDefaultExecutiveSummaryLines,
  buildDefaultReportGreeting,
  computeReportCopyFingerprint,
  isReportCopyStale,
  joinReportCopyLines,
  splitReportCopyParagraphs,
  type DefaultExecutiveSummaryInput,
} from "@/lib/planner-report-export/report-copy";
import { useReportCopyStore } from "@/lib/planner-report-export/report-copy-store";
import {
  resolveCoverLogoUrl,
  type PlannerReportCopyState,
} from "@/lib/planner-report-export/report-copy-state";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

type FingerprintInput = {
  mediaIds: readonly string[];
  quantities?: Record<string, number>;
  priceOptionIndex?: Record<string, number>;
};

/** C-full-1 — 인사말·요약 자동 초안 + stale 배너 (브리프·레거시 공용) */
export function useReportCopyAutoDraft(params: {
  isKo: boolean;
  enabled: boolean;
  fingerprint: FingerprintInput;
  strategyInput: DefaultExecutiveSummaryInput;
}) {
  const clientName = useReportCopyStore((s) => s.clientName);
  const greeting = useReportCopyStore((s) => s.greeting);
  const executiveSummary = useReportCopyStore((s) => s.executiveSummary);
  const greetingTouched = useReportCopyStore((s) => s.greetingTouched);
  const executiveSummaryTouched = useReportCopyStore(
    (s) => s.executiveSummaryTouched,
  );
  const copyFingerprint = useReportCopyStore((s) => s.copyFingerprint);
  const setGreeting = useReportCopyStore((s) => s.setGreeting);
  const setExecutiveSummary = useReportCopyStore((s) => s.setExecutiveSummary);
  const applyDraft = useReportCopyStore((s) => s.applyDraft);
  const acknowledgeFingerprint = useReportCopyStore(
    (s) => s.acknowledgeFingerprint,
  );

  const copyFingerprintCurrent = useMemo(
    () => computeReportCopyFingerprint(params.fingerprint),
    [
      params.fingerprint.mediaIds.join(","),
      JSON.stringify(params.fingerprint.quantities ?? {}),
      JSON.stringify(params.fingerprint.priceOptionIndex ?? {}),
    ],
  );

  const strategyInputKey = useMemo(
    () =>
      JSON.stringify({
        isKo: params.strategyInput.isKo,
        campaignGoal: params.strategyInput.campaignGoal,
        goalTitle: params.strategyInput.goalTitle,
        industryKey: params.strategyInput.industryKey,
        industryText: params.strategyInput.industryText,
        regionsText: params.strategyInput.regionsText,
        portfolioCount: params.strategyInput.portfolioCount,
        topMediaName: params.strategyInput.topMediaName,
      }),
    [params.strategyInput],
  );

  const executiveSummaryLines = useMemo(
    () => splitReportCopyParagraphs(executiveSummary),
    [executiveSummary],
  );

  useEffect(() => {
    if (!params.enabled) return;
    if (greetingTouched || executiveSummaryTouched) return;
    if (params.fingerprint.mediaIds.length === 0) return;
    const nextGreeting = buildDefaultReportGreeting(
      params.isKo,
      clientName.trim() || undefined,
    );
    const nextExecutive = joinReportCopyLines(
      buildDefaultExecutiveSummaryLines(params.strategyInput),
    );
    if (
      greeting === nextGreeting &&
      executiveSummary === nextExecutive &&
      copyFingerprint === copyFingerprintCurrent
    ) {
      return;
    }
    applyDraft({
      greeting: nextGreeting,
      executiveSummary: nextExecutive,
      fingerprint: copyFingerprintCurrent,
    });
  }, [
    params.enabled,
    params.isKo,
    params.strategyInput,
    strategyInputKey,
    greetingTouched,
    executiveSummaryTouched,
    params.fingerprint.mediaIds.length,
    copyFingerprintCurrent,
    clientName,
    greeting,
    executiveSummary,
    copyFingerprint,
    applyDraft,
  ]);

  const copyStale = isReportCopyStale({
    copyFingerprint,
    greetingTouched,
    executiveSummaryTouched,
    currentFingerprint: copyFingerprintCurrent,
  });

  const regenerate = useCallback(() => {
    const nextGreeting = buildDefaultReportGreeting(
      params.isKo,
      clientName.trim() || undefined,
    );
    const nextExecutive = joinReportCopyLines(
      buildDefaultExecutiveSummaryLines(params.strategyInput),
    );
    applyDraft({
      greeting: nextGreeting,
      executiveSummary: nextExecutive,
      fingerprint: copyFingerprintCurrent,
    });
  }, [
    params.isKo,
    params.strategyInput,
    clientName,
    copyFingerprintCurrent,
    applyDraft,
  ]);

  const keepEdits = useCallback(() => {
    acknowledgeFingerprint(copyFingerprintCurrent);
  }, [acknowledgeFingerprint, copyFingerprintCurrent]);

  return {
    greeting,
    executiveSummary,
    executiveSummaryLines,
    setGreeting,
    setExecutiveSummary,
    copyStale,
    regenerate,
    keepEdits,
    copyFingerprintCurrent,
  };
}

export function mergeReportCopyIntoExportPayload(
  payload: PlannerReportExportPayload,
  copy: PlannerReportCopyState,
  fallbackLogoUrl?: string | null,
): PlannerReportExportPayload {
  const executiveSummaryLines = splitReportCopyParagraphs(copy.executiveSummary);
  return {
    ...payload,
    documentTitle: copy.documentTitle.trim() || payload.documentTitle,
    clientName: copy.clientName.trim() || undefined,
    coverLogoUrl: resolveCoverLogoUrl(copy, fallbackLogoUrl),
    greetingText: copy.greeting.trim() || undefined,
    executiveSummaryLines:
      executiveSummaryLines.length > 0 ? executiveSummaryLines : undefined,
  };
}
