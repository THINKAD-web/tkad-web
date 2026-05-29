import { OoHQuoteStatus, OohContractStatus, type OoHQuote } from "@prisma/client";
import {
  QUOTE_CAMPAIGN_PERIOD_CONFIG,
  type QuoteCampaignPeriodKey,
} from "@/lib/quote-wizard-pricing";

export const OOH_PERIOD_MONTHS: Record<string, number> = {
  "2weeks": 0,
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "12months": 12,
};

export function periodLabelFromKey(
  periodKey: string | null | undefined,
  locale: string,
): string {
  const isKo = locale !== "en";
  const k = periodKey ?? "1month";
  const labelsKo: Record<string, string> = {
    "2weeks": "2주",
    "1month": "1개월",
    "3months": "3개월",
    "6months": "6개월",
    "12months": "12개월",
  };
  const labelsEn: Record<string, string> = {
    "2weeks": "2 weeks",
    "1month": "1 month",
    "3months": "3 months",
    "6months": "6 months",
    "12months": "12 months",
  };
  return (isKo ? labelsKo : labelsEn)[k] ?? (isKo ? "기간 미지정" : "Period");
}

export function estimateEndDate(
  start: Date,
  periodKey: string | null | undefined,
): Date {
  const key = (periodKey ?? "1month") as QuoteCampaignPeriodKey;
  const cfg = QUOTE_CAMPAIGN_PERIOD_CONFIG[key];
  const d = new Date(start.getTime());
  if (cfg?.months == null) {
    d.setDate(d.getDate() + (cfg?.days ?? 14));
    return d;
  }
  d.setMonth(d.getMonth() + cfg.months);
  return d;
}

export type OoHQuotePublicJson = {
  id: string;
  status: OoHQuoteStatus;
  clientName: string;
  clientCompany: string | null;
  mediaIds: string[];
  totalAmount: number;
  period: string;
  budgetMin: number | null;
  budgetMax: number | null;
  startDate: string | null;
  endDate: string | null;
  bookingRequestedAt: string | null;
  bookingConfirmedAt: string | null;
  invoiceSentAt: string | null;
  paymentConfirmedAt: string | null;
  contractConfirmedAt: string | null;
  contractDocUrl: string | null;
  invoiceDocUrl: string | null;
  contractStatus: OohContractStatus | null;
  contractSigned: boolean;
  canSignContract: boolean;
};

export function serializeOoHQuotePublic(
  row: OoHQuote,
  contract?: { status: OohContractStatus } | null,
): OoHQuotePublicJson {
  const contractSigned =
    contract?.status === OohContractStatus.signed ||
    contract?.status === OohContractStatus.confirmed;
  const canSignContract =
    row.status === OoHQuoteStatus.booking_confirmed &&
    (!contract || contract.status === OohContractStatus.pending);

  return {
    id: row.id,
    status: row.status,
    clientName: row.clientName,
    clientCompany: row.clientCompany,
    mediaIds: row.mediaIds,
    totalAmount: row.totalAmount,
    period: row.period,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    bookingRequestedAt: row.bookingRequestedAt?.toISOString() ?? null,
    bookingConfirmedAt: row.bookingConfirmedAt?.toISOString() ?? null,
    invoiceSentAt: row.invoiceSentAt?.toISOString() ?? null,
    paymentConfirmedAt: row.paymentConfirmedAt?.toISOString() ?? null,
    contractConfirmedAt: row.contractConfirmedAt?.toISOString() ?? null,
    contractDocUrl: row.contractDocUrl,
    invoiceDocUrl: row.invoiceDocUrl,
    contractStatus: contract?.status ?? null,
    contractSigned,
    canSignContract,
  };
}

export function canProceedBooking(status: OoHQuoteStatus): boolean {
  return status === OoHQuoteStatus.sent;
}

export function canAdminBookingConfirm(status: OoHQuoteStatus): boolean {
  return (
    status === OoHQuoteStatus.booking_requested ||
    status === OoHQuoteStatus.booking_pending
  );
}

export function canAdminSendInvoice(status: OoHQuoteStatus): boolean {
  return status === OoHQuoteStatus.booking_confirmed;
}

export function canAdminPaymentConfirm(status: OoHQuoteStatus): boolean {
  return (
    status === OoHQuoteStatus.invoice_sent ||
    status === OoHQuoteStatus.payment_pending
  );
}

export function canAdminContractConfirm(status: OoHQuoteStatus): boolean {
  return status === OoHQuoteStatus.payment_confirmed;
}
