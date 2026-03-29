import { OoHQuoteStatus, type OoHQuote } from "@prisma/client";

export const OOH_PERIOD_MONTHS: Record<string, number> = {
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
    "1month": "1개월",
    "3months": "3개월",
    "6months": "6개월",
    "12months": "12개월",
  };
  const labelsEn: Record<string, string> = {
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
  const m = OOH_PERIOD_MONTHS[periodKey ?? "1month"] ?? 1;
  const d = new Date(start.getTime());
  d.setMonth(d.getMonth() + m);
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
};

export function serializeOoHQuotePublic(row: OoHQuote): OoHQuotePublicJson {
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
