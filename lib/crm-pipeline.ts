import type { SalesPipelineStage } from "@prisma/client";

export const PIPELINE_STAGES: SalesPipelineStage[] = [
  "new_inquiry",
  "consulting",
  "quote_sent",
  "contract_negotiation",
  "contract_closed",
  "in_flight",
  "completed",
];

export const PIPELINE_STAGE_LABEL: Record<
  SalesPipelineStage,
  { ko: string; en: string }
> = {
  new_inquiry: { ko: "신규문의", en: "New inquiry" },
  consulting: { ko: "상담중", en: "Consulting" },
  quote_sent: { ko: "견적발송", en: "Quote sent" },
  contract_negotiation: { ko: "계약협의", en: "Negotiation" },
  contract_closed: { ko: "계약완료", en: "Contract closed" },
  in_flight: { ko: "집행중", en: "In flight" },
  completed: { ko: "완료", en: "Completed" },
};

/** 파이프라인 단계별 성사 확률 (매출 예측) */
export const STAGE_WIN_PROBABILITY: Record<SalesPipelineStage, number> = {
  new_inquiry: 0.05,
  consulting: 0.1,
  quote_sent: 0.3,
  contract_negotiation: 0.7,
  contract_closed: 0.9,
  in_flight: 0.95,
  completed: 1,
};

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function weightedForecast(amountWon: number, stage: SalesPipelineStage): number {
  return Math.round(amountWon * STAGE_WIN_PROBABILITY[stage]);
}
