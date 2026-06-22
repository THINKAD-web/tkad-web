/** API·클라이언트 공용 — 플래너 메트릭 payload 정규화 */
export type EmailReportMetrics = {
  impressions?: number | null;
  reach?: number | null;
  frequency?: number | null;
};

export function normalizeEmailReportMetrics(
  raw: unknown,
): EmailReportMetrics {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const m = raw as Record<string, unknown>;

  const impressions =
    typeof m.impressions === "number" && Number.isFinite(m.impressions)
      ? m.impressions
      : typeof m.estimatedTotalImpressions === "number" &&
          Number.isFinite(m.estimatedTotalImpressions)
        ? m.estimatedTotalImpressions
        : null;

  const reach =
    typeof m.reach === "number" && Number.isFinite(m.reach)
      ? m.reach
      : typeof m.blendDailyReach === "number" &&
          Number.isFinite(m.blendDailyReach)
        ? Math.round(m.blendDailyReach * 30)
        : null;

  const frequency =
    typeof m.frequency === "number" && Number.isFinite(m.frequency)
      ? m.frequency
      : typeof m.avgFrequency === "number" && Number.isFinite(m.avgFrequency)
        ? m.avgFrequency
        : null;

  return { impressions, reach, frequency };
}
