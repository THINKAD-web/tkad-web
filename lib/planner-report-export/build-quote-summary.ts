/**
 * C-full-3a 견적 요약 표 — 매체비 SSOT + 제작비 + VAT.
 *
 * 매체비(`supplyWon`)는 `budgetHonesty.mixWon` (= confirmedMixWon 경로)만 사용.
 * 협의가 매체는 합계·VAT에서 제외하고 별도 행으로 표시한다.
 */

import { mediaQuoteOnlyLabel } from "@/lib/media-pricing-mode";
import type { QuoteOnlyNotice } from "@/lib/planner/quote-only-portfolio";
import type { PlannerExportQuoteSummary } from "@/lib/planner-report-export/types";

export function buildPlannerQuoteSummary(args: {
  /** 확정 매체비 — budgetHonesty.mixWon SSOT */
  mixWon: number;
  /** 3a: 캠페인 총 제작비 직접 입력 (3b: 매체별 합계로 대체 예정) */
  productionCostWon?: number | null;
  quoteOnlyNotice?: Pick<QuoteOnlyNotice, "count" | "groupLabel">;
  isKo: boolean;
}): PlannerExportQuoteSummary | undefined {
  const supplyWon = Math.max(0, Math.round(args.mixWon));
  const productionWon = Math.max(
    0,
    Math.round(args.productionCostWon ?? 0),
  );

  if (supplyWon <= 0 && !args.quoteOnlyNotice) return undefined;

  const vatWon = Math.round((supplyWon + productionWon) * 0.1);
  const totalWon = supplyWon + productionWon + vatWon;

  const hasQuoteOnly = Boolean(args.quoteOnlyNotice);
  const totalLabel = hasQuoteOnly
    ? args.isKo
      ? "합계 (협의 매체 제외)"
      : "Subtotal (inquiry media excluded)"
    : args.isKo
      ? "총액 (VAT 포함)"
      : "Total (incl. VAT)";

  const footnotes: string[] = [];
  if (args.quoteOnlyNotice) {
    footnotes.push(
      args.isKo
        ? `${args.quoteOnlyNotice.groupLabel} ${args.quoteOnlyNotice.count}건은 별도 협의 후 추가됩니다.`
        : `${args.quoteOnlyNotice.count} ${args.quoteOnlyNotice.groupLabel} item(s) will be added after inquiry.`,
    );
  }

  const quoteOnlyLine = args.quoteOnlyNotice
    ? {
        label: args.isKo
          ? `${args.quoteOnlyNotice.groupLabel} ${args.quoteOnlyNotice.count}건 — 별도 협의`
          : `${args.quoteOnlyNotice.count} ${args.quoteOnlyNotice.groupLabel} — inquiry`,
        amountLabel: mediaQuoteOnlyLabel(args.isKo),
      }
    : undefined;

  return {
    supplyWon,
    productionWon,
    vatWon,
    totalWon,
    totalLabel,
    quoteOnlyLine,
    footnotes,
  };
}
