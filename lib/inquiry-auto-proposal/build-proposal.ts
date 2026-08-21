import type { MediaItem } from "@/lib/media-data";
import {
  budgetSplitByCategory,
  computePlannerMetrics,
  portfolioCpmByCategory,
} from "@/lib/planner-logic";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";
import {
  SELLING_UNIT_FOLLOWUP_LINE_KO,
} from "./candidate-filter";
import type { ParsedInquiryProposal } from "./parse-inquiry-text";

export function buildInquiryAutoProposalPayload(args: {
  portfolio: MediaItem[];
  parsed: ParsedInquiryProposal;
  sellingUnitFollowUp: boolean;
  generatedAt?: string;
}): PlannerReportExportPayload {
  const { portfolio, parsed } = args;
  const budgetMan = Math.max(1, Math.round(parsed.budgetWon / 10_000));
  const months = Math.max(1, parsed.months);
  const metrics = computePlannerMetrics(portfolio, budgetMan, months);
  const split = budgetSplitByCategory(portfolio);
  const budgetAllocation = split.map((s) => ({
    key: s.key,
    label: s.labelKo,
    pct: s.pct,
    valueWon: s.value,
    actualWon: s.actualWon,
  }));
  const cpmBars = portfolioCpmByCategory(portfolio).map((b) => ({
    key: b.key,
    label: b.labelKo,
    value: b.cpm,
  }));
  const blended =
    metrics && portfolio.length > 0
      ? Math.round(
          (cpmBars.reduce((s, b) => s + b.value, 0) / Math.max(cpmBars.length, 1)) ||
            0,
        )
      : null;

  const effectSummaryLines = [
    parsed.budgetAssumed
      ? "예산이 본문에서 확실하지 않아 3,000만원으로 가정했습니다. 확정 예산은 확인 후 회신드립니다."
      : `요청 예산 약 ₩${parsed.budgetWon.toLocaleString("ko-KR")} / ${months}개월 기준입니다.`,
    ...(args.sellingUnitFollowUp ? [SELLING_UNIT_FOLLOWUP_LINE_KO] : []),
  ];

  return buildOohReportPayload({
    isKo: true,
    goalTitle: "문의 자동 매칭 제안 (dry-run)",
    budgetMan,
    periodDisplay: `${months}개월`,
    regionsText: parsed.wantsAirport ? "인천공항" : "대한민국",
    categoriesText: [
      parsed.wantsAirport ? "공항" : null,
      parsed.wantsRestStopLed ? "휴게소 LED" : null,
    ]
      .filter(Boolean)
      .join(" · ") || "OOH",
    ageText: "미지정",
    industryText: "미지정",
    portfolio,
    metrics,
    blendedCpmKrw: blended && blended > 0 ? blended : null,
    budgetAllocation,
    cpmBars,
    effectSummaryLines,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    months,
  });
}
