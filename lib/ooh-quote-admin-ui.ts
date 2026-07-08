/** Admin OoH quote pipeline — action button visibility (UI only). */

export type OohQuoteAdminRow = {
  status: string;
  contractSigned: boolean;
};

export function canShowSendQuote(row: OohQuoteAdminRow): boolean {
  return row.status === "draft" || row.status === "sent";
}

export function canShowBookingConfirm(row: OohQuoteAdminRow): boolean {
  return row.status === "booking_requested" || row.status === "booking_pending";
}

/** Requires customer e-sign before invoice (matches send-invoice API). */
export function canShowSendInvoice(row: OohQuoteAdminRow): boolean {
  return row.status === "booking_confirmed" && row.contractSigned;
}

export function canShowAwaitingSignature(row: OohQuoteAdminRow): boolean {
  return row.status === "booking_confirmed" && !row.contractSigned;
}

export function canShowPaymentConfirm(row: OohQuoteAdminRow): boolean {
  return row.status === "invoice_sent" || row.status === "payment_pending";
}

export function canShowContractConfirm(row: OohQuoteAdminRow): boolean {
  return row.status === "payment_confirmed";
}

export function canShowCancel(row: OohQuoteAdminRow): boolean {
  return ![
    "cancelled",
    "completed",
    "contract_confirmed",
    "in_progress",
  ].includes(row.status);
}
