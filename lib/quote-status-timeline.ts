export const QUOTE_STATUS_ORDER = [
  "draft",
  "sent",
  "booking_requested",
  "booking_pending",
  "booking_confirmed",
  "invoice_sent",
  "payment_pending",
  "payment_confirmed",
  "contract_confirmed",
  "in_progress",
  "completed",
] as const;

export type QuoteTimelineStepId =
  | "quote"
  | "booking"
  | "esign"
  | "invoice"
  | "contract";

export function quoteStatusLevel(status: string): number {
  const i = (QUOTE_STATUS_ORDER as readonly string[]).indexOf(status);
  return i >= 0 ? i : 0;
}

export function isQuoteTimelineStepDone(
  step: QuoteTimelineStepId,
  level: number,
  contractSigned: boolean,
): boolean {
  switch (step) {
    case "quote":
      return level >= 1;
    case "booking":
      return level >= 4;
    case "esign":
      return contractSigned;
    case "invoice":
      return level >= 5;
    case "contract":
      return level >= 8;
    default:
      return false;
  }
}

/**
 * Which milestone shows "진행 중". `sent` stays on completed quote step only —
 * do not pulse "부킹 확정" before the customer submits a booking request.
 */
export function resolveQuoteTimelineCurrentStep(
  status: string,
  contractSigned: boolean,
): QuoteTimelineStepId | null {
  switch (status) {
    case "draft":
      return "quote";
    case "sent":
      return null;
    case "booking_requested":
    case "booking_pending":
      return "booking";
    case "booking_confirmed":
      return contractSigned ? "invoice" : "esign";
    case "invoice_sent":
    case "payment_pending":
      return "invoice";
    case "payment_confirmed":
      return "contract";
    default:
      return null;
  }
}
