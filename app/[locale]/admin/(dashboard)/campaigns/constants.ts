export type CampaignStatus =
  | "proposal"
  | "negotiation"
  | "contract"
  | "production"
  | "airing"
  | "completed";

export type FinancialDocKind = "quote" | "contract" | "invoice";

export type FinancialDocStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled";

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  proposal: "제안",
  negotiation: "협의",
  contract: "계약",
  production: "제작",
  airing: "송출",
  completed: "완료",
};

export const STATUS_OPTIONS: Record<CampaignStatus, string> = {
  proposal: "제안",
  negotiation: "협의",
  contract: "계약",
  production: "제작",
  airing: "송출",
  completed: "완료",
};

export const FINANCIAL_DOC_KIND_LABEL: Record<FinancialDocKind, string> = {
  quote: "견적",
  contract: "계약",
  invoice: "청구",
};

export const FINANCIAL_DOC_STATUS_LABEL: Record<FinancialDocStatus, string> = {
  draft: "작성 중",
  sent: "발송됨",
  paid: "결제 완료",
  overdue: "연체",
  cancelled: "취소",
};

export const DOC_STATUS_LIST: { value: FinancialDocStatus; label: string }[] =
  (Object.entries(FINANCIAL_DOC_STATUS_LABEL) as [FinancialDocStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  );
