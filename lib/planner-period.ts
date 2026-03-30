/** UI·PDF용 캠페인 기간 프리셋 (내부는 월 단위, 1주≈7/30) */
export const PLANNER_PERIOD_OPTIONS = [
  { id: "1w", months: 7 / 30, labelKey: "period1w" as const },
  { id: "2w", months: 14 / 30, labelKey: "period2w" as const },
  { id: "1m", months: 1, labelKey: "period1m" as const },
  { id: "3m", months: 3, labelKey: "period3m" as const },
  { id: "6m", months: 6, labelKey: "period6m" as const },
  { id: "1y", months: 12, labelKey: "period1y" as const },
] as const;

const TOL = 0.04;

export function formatPlannerPeriodDisplay(
  months: number,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const preset = PLANNER_PERIOD_OPTIONS.find(
    (o) => Math.abs(months - o.months) < TOL,
  );
  if (preset) return t(preset.labelKey);
  const rounded = Math.round(months);
  if (Math.abs(months - rounded) < 0.01 && rounded >= 1) {
    return t("periodMonthsShort", { n: rounded });
  }
  return t("periodApproxMonthsDecimal", {
    months: Math.round(months * 10) / 10,
  });
}
