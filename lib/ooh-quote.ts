import { OoHQuoteStatus, OohContractStatus, type OoHQuote } from "@prisma/client";
import {
  partialPeriodRateDaysFromKey,
  partialRateLookupKeyFromDays,
  isPartialPeriodRateAdminKey,
  type PartialPeriodRateAdminKey,
} from "@/lib/media-partial-period-rates";

/** OoH·API 견적 periodKey — 신 6키 + 레거시 월/주 키 */
export const OOH_PERIOD_MONTHS: Record<string, number> = {
  "1day": 0,
  "3days": 0,
  "5days": 0,
  "7days": 0,
  "15days": 0,
  "30days": 1,
  "2weeks": 0,
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "12months": 12,
};

const OOH_PERIOD_DAYS: Record<string, number> = {
  "1day": 1,
  "3days": 3,
  "5days": 5,
  "7days": 7,
  "15days": 15,
  "30days": 30,
  "2weeks": 14,
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "12months": 360,
};

export function periodLabelFromKey(
  periodKey: string | null | undefined,
  locale: string,
): string {
  const isKo = locale !== "en";
  const k = periodKey ?? "30days";
  const labelsKo: Record<string, string> = {
    "1day": "1일",
    "3days": "3일",
    "5days": "5일",
    "7days": "7일",
    "15days": "15일",
    "30days": "30일",
    "2weeks": "2주",
    "1month": "1개월",
    "3months": "3개월",
    "6months": "6개월",
    "12months": "12개월",
  };
  const labelsEn: Record<string, string> = {
    "1day": "1 day",
    "3days": "3 days",
    "5days": "5 days",
    "7days": "7 days",
    "15days": "15 days",
    "30days": "30 days",
    "2weeks": "2 weeks",
    "1month": "1 month",
    "3months": "3 months",
    "6months": "6 months",
    "12months": "12 months",
  };
  return (isKo ? labelsKo : labelsEn)[k] ?? (isKo ? "기간 미지정" : "Period");
}

export function oohPeriodDaysFromKey(
  periodKey: string | null | undefined,
): number {
  const k = periodKey ?? "30days";
  if (k in OOH_PERIOD_DAYS) return OOH_PERIOD_DAYS[k]!;
  if (isPartialPeriodRateAdminKey(k)) {
    return partialPeriodRateDaysFromKey(k as PartialPeriodRateAdminKey);
  }
  return 30;
}

export function estimateEndDate(
  start: Date,
  periodKey: string | null | undefined,
): Date {
  const days = oohPeriodDaysFromKey(periodKey);
  const d = new Date(start.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export type OoHQuotePublicJson = {
  id: string;
  status: OoHQuoteStatus;
  clientName: string;
  clientPhone: string | null;
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
  revisionMessage: string | null;
  revisionRequestedAt: string | null;
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
    clientPhone: row.clientPhone?.trim() || null,
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
    revisionMessage: row.revisionMessage,
    revisionRequestedAt: row.revisionRequestedAt?.toISOString() ?? null,
  };
}

export function canProceedBooking(status: OoHQuoteStatus): boolean {
  return status === OoHQuoteStatus.sent;
}

/** 고객 진행 요청 철회 — 관리자 부킹 확정 전에만 허용 */
export function canWithdrawProceed(status: OoHQuoteStatus): boolean {
  return status === OoHQuoteStatus.booking_requested;
}

/** 고객 견적 수정 요청 — 발송(sent) 상태에서만 허용 */
export function canRequestRevision(status: OoHQuoteStatus): boolean {
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

/** Admin→OoH 브릿지용 periodKey 추론 */
export function inferOohPeriodKeyFromDays(periodDays: number): string {
  const key = partialRateLookupKeyFromDays(periodDays);
  if (key) return key;
  if (periodDays >= 28 && periodDays <= 31) return "30days";
  return "30days";
}
