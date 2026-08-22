import type { MediaItem } from "@/lib/media-data";
import type { PlannerExportMediaRow } from "@/lib/planner-report-export/types";
import {
  computePlannerPortfolioBudgetStatus,
  formatPlannerSharePct,
} from "@/lib/planner-logic";
import type { PlannerPortfolioPricing } from "@/lib/planner/planner-media-quantity";

export type PlannerRecommendRationale = {
  summaryLines: string[];
  mediaReasons: { name: string; reason: string }[];
};

/**
 * 보고서 "추천 근거" — 기존 포트폴리오·예산·노출 수치만 서술 (새 추천 계산 없음).
 *
 * A-1 Wave 3 — CPM 을 직접 계산하지 않는다.
 * 예전에는 `computePortfolioReportMetrics(portfolio, months)` 를 pricing·periodCtx
 * **없이** 다시 호출해, 같은 보고서의 KPI CPM 과 다른 값이 본문에 실릴 수 있었다.
 * 이제 호출자가 이미 계산한 값을 넘겨받는다.
 */
export function buildPlannerRecommendRationale(args: {
  portfolio: readonly MediaItem[];
  portfolioRows: readonly PlannerExportMediaRow[];
  budgetMan: number;
  months: number;
  isKo: boolean;
  /** 호출자가 계산한 값 — 여기서 재계산하지 않는다 */
  blendedCpmKrw: number | null;
  totalImpressions: number;
  monthlyImpressions: number;
  pricing?: PlannerPortfolioPricing;
  isAutoPortfolio?: boolean;
  isInquiryMatched?: boolean;
}): PlannerRecommendRationale | undefined {
  const {
    portfolio,
    portfolioRows,
    budgetMan,
    months,
    isKo,
    blendedCpmKrw,
    totalImpressions,
    monthlyImpressions,
    pricing,
    isAutoPortfolio,
    isInquiryMatched,
  } = args;
  if (portfolio.length === 0) return undefined;

  const budget = computePlannerPortfolioBudgetStatus(
    portfolio,
    budgetMan,
    months,
    pricing,
  );
  const fmt = (n: number) => n.toLocaleString(isKo ? "ko-KR" : "en-US");

  const utilPct =
    budget.monthlyBudgetMan > 0
      ? Math.round((budget.monthlyTotalMan / budget.monthlyBudgetMan) * 1000) /
        10
      : 0;

  const summaryLines: string[] = [];

  if (isInquiryMatched) {
    summaryLines.push(
      isKo
        ? `문의 내용으로 자동 매칭된 ${portfolio.length}개 매체로 구성된 플랜입니다.`
        : `This plan comprises ${portfolio.length} media auto-matched from the inquiry.`,
    );
  } else if (isAutoPortfolio) {
    summaryLines.push(
      isKo
        ? `캠페인 조건(목표·지역·타깃)에 맞춰 매칭 점수 상위 후보 중 월 예산 상한(92%) 내에서 ${portfolio.length}개 매체를 자동 선별했습니다.`
        : `From top-scored matches for your campaign context, ${portfolio.length} media were auto-selected within the monthly budget cap (92%).`,
    );
  } else {
    summaryLines.push(
      isKo
        ? `직접 선택한 ${portfolio.length}개 매체로 구성된 플랜입니다.`
        : `This plan comprises ${portfolio.length} media you selected.`,
    );
  }

  const overNote = budget.overBudget
    ? isKo
      ? " — 월 단가 합이 예산을 초과합니다"
      : " — monthly rates exceed budget"
    : "";

  summaryLines.push(
    isKo
      ? `월 예산 ${fmt(Math.round(budget.monthlyBudgetMan))}만원 대비 ${formatPlannerSharePct(utilPct)}(${fmt(Math.round(budget.monthlyTotalMan))}만원) 활용${overNote}.`
      : `Monthly budget use: ${formatPlannerSharePct(utilPct)} of ${fmt(Math.round(budget.monthlyBudgetMan))}M KRW (${fmt(Math.round(budget.monthlyTotalMan))}M planned)${overNote}.`,
  );

  if (totalImpressions > 0) {
    summaryLines.push(
      isKo
        ? `집행 기간 총 ${fmt(totalImpressions)}회·월 ${fmt(monthlyImpressions)}회 노출을 합산한 조합입니다.`
        : `Combined reach: ${fmt(totalImpressions)} total / ${fmt(monthlyImpressions)} monthly impressions over the flight.`,
    );
  }

  if (blendedCpmKrw != null && blendedCpmKrw > 0) {
    summaryLines.push(
      isKo
        ? `블렌디드 CPM ₩${fmt(blendedCpmKrw)} — 예산 대비 노출 효율의 참고 지표입니다.`
        : `Blended CPM ₩${fmt(blendedCpmKrw)} — reference cost per 1,000 impressions for this mix.`,
    );
  }

  const mediaReasons = portfolioRows
    .filter((r) => r.recommendReason?.trim())
    .map((r) => ({
      name: r.name,
      reason: r.recommendReason!.trim(),
    }));

  return { summaryLines, mediaReasons };
}
