/**
 * 예산 vs 믹스 합계 — Step 3 화면과 PDF/PPTX가 같은 문구를 쓴다.
 * 숫자는 calcMixMetrics 의 overBudgetWon / budgetUsedRate.
 */

export function formatWonAmount(n: number, isKo: boolean): string {
  return isKo
    ? `₩${n.toLocaleString("ko-KR")}`
    : `₩${n.toLocaleString("en-US")}`;
}

export function budgetUsedPct(budgetUsedRate: number): number {
  return Math.round(budgetUsedRate * 100);
}

/** Step 3 MetricsPanel 배너 — PDF KPI 블록도 이 문자열만 사용 */
export function overBudgetBannerLine(
  overBudgetWon: number,
  isKo: boolean,
): string {
  const won = formatWonAmount(overBudgetWon, isKo);
  return isKo
    ? `예산 초과 ${won} — 수량을 줄이거나 예산을 조정해 주세요.`
    : `Over budget by ${won}.`;
}

export function budgetCoverValue(args: {
  requestWon: number;
  mixWon: number;
  budgetUsedRate: number;
  isKo: boolean;
}): string {
  const pct = budgetUsedPct(args.budgetUsedRate);
  return args.isKo
    ? `요청 예산 ${formatWonAmount(args.requestWon, true)} / 이 구성 ${formatWonAmount(args.mixWon, true)} (${pct}%)`
    : `Requested ${formatWonAmount(args.requestWon, false)} / this mix ${formatWonAmount(args.mixWon, false)} (${pct}%)`;
}

export function mixVsBudgetFootnote(
  budgetUsedRate: number,
  isKo: boolean,
): string {
  const pct = budgetUsedPct(budgetUsedRate);
  return isKo
    ? `요청 예산 대비 ${pct}% 구성입니다`
    : `This mix is ${pct}% of the requested budget`;
}

export type PlannerExportBudgetHonesty = {
  requestWon: number;
  mixWon: number;
  overBudgetWon: number;
  budgetUsedRate: number;
  coverValue: string;
  overBudgetBanner: string | null;
  mixVsBudgetFootnote: string;
};

export function buildExportBudgetHonesty(args: {
  requestWon: number;
  mixWon: number;
  overBudgetWon: number;
  budgetUsedRate: number;
  isKo: boolean;
}): PlannerExportBudgetHonesty | undefined {
  if (args.requestWon <= 0) return undefined;
  return {
    requestWon: args.requestWon,
    mixWon: args.mixWon,
    overBudgetWon: args.overBudgetWon,
    budgetUsedRate: args.budgetUsedRate,
    coverValue: budgetCoverValue(args),
    overBudgetBanner:
      args.overBudgetWon > 0
        ? overBudgetBannerLine(args.overBudgetWon, args.isKo)
        : null,
    mixVsBudgetFootnote: mixVsBudgetFootnote(args.budgetUsedRate, args.isKo),
  };
}
