/**
 * 예산 vs 믹스 합계 — Step 3 화면과 PDF/PPTX가 같은 문구를 쓴다.
 * 협의가(quote_only) 매체는 확정분만 합산한다.
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
  /** 협의가 매체가 있으면 「확정」 라벨 */
  confirmedLabel?: boolean;
}): string {
  const pct = budgetUsedPct(args.budgetUsedRate);
  const mixLabel = args.confirmedLabel
    ? args.isKo
      ? "확정"
      : "confirmed"
    : args.isKo
      ? "이 구성"
      : "this mix";
  return args.isKo
    ? `요청 예산 ${formatWonAmount(args.requestWon, true)} / ${mixLabel} ${formatWonAmount(args.mixWon, true)} (${pct}%)`
    : `Requested ${formatWonAmount(args.requestWon, false)} / ${mixLabel} ${formatWonAmount(args.mixWon, false)} (${pct}%)`;
}

export function mixVsBudgetFootnote(
  budgetUsedRate: number,
  isKo: boolean,
  opts?: { quoteOnlyExcluded?: boolean },
): string {
  const pct = budgetUsedPct(budgetUsedRate);
  if (opts?.quoteOnlyExcluded) {
    return isKo
      ? `요청 예산 대비 ${pct}% (확정분 기준 · 문의 매체 제외)`
      : `${pct}% of requested budget (confirmed only · inquiry media excluded)`;
  }
  return isKo
    ? `요청 예산 대비 ${pct}% 구성입니다`
    : `This mix is ${pct}% of the requested budget`;
}

export type PlannerExportBudgetHonesty = {
  requestWon: number;
  /** 확정(고정 단가) 합계 — 협의가 제외 */
  mixWon: number;
  overBudgetWon: number;
  budgetUsedRate: number;
  coverValue: string;
  overBudgetBanner: string | null;
  mixVsBudgetFootnote: string;
  /** 협의가 매체 각주 (1p·매체구성) */
  quoteOnlyFootnote?: string;
  quoteOnlyCount?: number;
};

export function buildExportBudgetHonesty(args: {
  requestWon: number;
  mixWon: number;
  overBudgetWon: number;
  budgetUsedRate: number;
  isKo: boolean;
  quoteOnlyCount?: number;
  quoteOnlyFootnote?: string;
}): PlannerExportBudgetHonesty | undefined {
  if (args.requestWon <= 0) return undefined;
  const hasQuoteOnly = (args.quoteOnlyCount ?? 0) > 0;
  return {
    requestWon: args.requestWon,
    mixWon: args.mixWon,
    overBudgetWon: args.overBudgetWon,
    budgetUsedRate: args.budgetUsedRate,
    coverValue: budgetCoverValue({
      requestWon: args.requestWon,
      mixWon: args.mixWon,
      budgetUsedRate: args.budgetUsedRate,
      isKo: args.isKo,
      confirmedLabel: hasQuoteOnly,
    }),
    overBudgetBanner:
      args.overBudgetWon > 0
        ? overBudgetBannerLine(args.overBudgetWon, args.isKo)
        : null,
    mixVsBudgetFootnote: mixVsBudgetFootnote(args.budgetUsedRate, args.isKo, {
      quoteOnlyExcluded: hasQuoteOnly,
    }),
    quoteOnlyFootnote: args.quoteOnlyFootnote,
    quoteOnlyCount: args.quoteOnlyCount,
  };
}
