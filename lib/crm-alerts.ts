import type { CrmAccount, PipelineCard } from "@prisma/client";
import { daysSince } from "@/lib/crm-pipeline";

export type CrmAlertType = "contact_stale" | "quote_no_response";

export type CrmAlertItem = {
  type: CrmAlertType;
  cardId: string;
  company: string;
  name: string;
  assignedTo: string | null;
  message: string;
  days: number;
};

const CONTACT_STALE_DAYS = 3;
const QUOTE_NO_RESPONSE_DAYS = 5;

type AlertSource = Pick<
  PipelineCard,
  | "id"
  | "company"
  | "contactName"
  | "assignedTo"
  | "stage"
  | "lastContactAt"
  | "firstInquiryAt"
  | "quoteSentAt"
>;

export function buildAlertsForPipelineCard(card: AlertSource): CrmAlertItem[] {
  const alerts: CrmAlertItem[] = [];
  if (card.stage === "completed") return alerts;

  const last =
    card.lastContactAt ?? card.firstInquiryAt ?? new Date(0);
  const staleDays = daysSince(last);
  if (staleDays >= CONTACT_STALE_DAYS) {
    alerts.push({
      type: "contact_stale",
      cardId: card.id,
      company: card.company,
      name: card.contactName,
      assignedTo: card.assignedTo,
      message: `${card.company} 고객 팔로업이 필요합니다 (마지막 접촉 D+${staleDays})`,
      days: staleDays,
    });
  }

  if (card.stage === "quote_sent" && card.quoteSentAt) {
    const quoteDays = daysSince(card.quoteSentAt);
    if (quoteDays >= QUOTE_NO_RESPONSE_DAYS) {
      alerts.push({
        type: "quote_no_response",
        cardId: card.id,
        company: card.company,
        name: card.contactName,
        assignedTo: card.assignedTo,
        message: `${card.company} 견적 발송 후 ${quoteDays}일 미응답 — 후속 연락이 필요합니다`,
        days: quoteDays,
      });
    }
  }

  return alerts;
}

/** @deprecated PipelineCard 기준으로 대체 */
export function buildAlertsForAccount(account: CrmAccount): CrmAlertItem[] {
  return buildAlertsForPipelineCard({
    id: account.id,
    company: account.company,
    contactName: account.name,
    assignedTo: account.assignedTo,
    stage: account.pipelineStage,
    lastContactAt: account.lastContactAt,
    firstInquiryAt: account.firstInquiryAt,
    quoteSentAt: account.quoteSentAt,
  });
}

export function salesAlertRecipient(assignedTo: string | null): string | null {
  const assign = assignedTo?.trim();
  if (assign && assign.includes("@")) return assign;
  return (
    process.env.SALES_ALERT_EMAIL?.trim() ||
    process.env.ADMIN_DIGEST_EMAIL?.trim() ||
    process.env.CONTACT_ALERT_EMAIL?.trim() ||
    null
  );
}
