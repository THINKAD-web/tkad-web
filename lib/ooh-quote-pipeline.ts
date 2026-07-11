import type { OohQuoteAdminRow } from "@/lib/ooh-quote-admin-ui";
import {
  canShowAwaitingSignature,
  canShowBookingConfirm,
  canShowContractConfirm,
  canShowPaymentConfirm,
  canShowSendInvoice,
  canShowSendQuote,
} from "@/lib/ooh-quote-admin-ui";

/** Admin pipeline display steps (8). */
export const PIPELINE_STEP_IDS = [
  "draft",
  "sent",
  "booking",
  "booking_confirmed",
  "esign",
  "invoice_sent",
  "payment_confirmed",
  "contract_confirmed",
] as const;

export type PipelineStepId = (typeof PIPELINE_STEP_IDS)[number];

export type OohQuotePipelineRow = OohQuoteAdminRow & {
  quotePdfSentAt?: string | null;
  bookingRequestedAt?: string | null;
  bookingConfirmedAt?: string | null;
  contractSignedAt?: string | null;
  invoiceSentAt?: string | null;
  paymentConfirmedAt?: string | null;
  contractConfirmedAt?: string | null;
  revisionMessage?: string | null;
  cancelReason?: string | null;
  createdAt?: string | null;
};

export type PipelineMilestone = {
  id: PipelineStepId;
  done: boolean;
  at: string | null;
};

export type PipelineException = "cancelled" | "expired";

export type AdminPipelineActionKey =
  | "sendQuote"
  | "resendQuote"
  | "bookingConfirm"
  | "awaitingSignature"
  | "sendInvoice"
  | "paymentConfirm"
  | "contractConfirm";

const STATUS_LEVEL: Record<string, number> = {
  draft: 0,
  sent: 1,
  expired: 1,
  booking_requested: 2,
  booking_pending: 2,
  booking_confirmed: 3,
  invoice_sent: 5,
  payment_pending: 5,
  payment_confirmed: 6,
  contract_confirmed: 7,
  in_progress: 8,
  completed: 8,
};

function statusLevel(status: string): number {
  return STATUS_LEVEL[status] ?? 0;
}

export function pipelineException(row: OohQuotePipelineRow): PipelineException | null {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "expired") return "expired";
  return null;
}

export function pipelineMilestones(row: OohQuotePipelineRow): PipelineMilestone[] {
  const level = statusLevel(row.status);

  return [
    {
      id: "draft",
      done: row.status !== "draft",
      at: row.createdAt ?? null,
    },
    {
      id: "sent",
      done: Boolean(row.quotePdfSentAt) || level >= 2,
      at: row.quotePdfSentAt ?? null,
    },
    {
      id: "booking",
      done: level >= 3,
      at: row.bookingRequestedAt ?? null,
    },
    {
      id: "booking_confirmed",
      done: Boolean(row.bookingConfirmedAt) || level >= 3,
      at: row.bookingConfirmedAt ?? null,
    },
    {
      id: "esign",
      done: row.contractSigned,
      at: row.contractSignedAt ?? null,
    },
    {
      id: "invoice_sent",
      done: Boolean(row.invoiceSentAt) || level >= 5,
      at: row.invoiceSentAt ?? null,
    },
    {
      id: "payment_confirmed",
      done: Boolean(row.paymentConfirmedAt) || level >= 6,
      at: row.paymentConfirmedAt ?? null,
    },
    {
      id: "contract_confirmed",
      done: Boolean(row.contractConfirmedAt) || level >= 7,
      at: row.contractConfirmedAt ?? null,
    },
  ];
}

/** Index of the active step (0–7), or -1 when pipeline is inactive. */
export function statusToStepIndex(row: OohQuotePipelineRow): number {
  if (pipelineException(row)) return -1;

  const milestones = pipelineMilestones(row);
  for (let i = 0; i < milestones.length; i++) {
    if (!milestones[i].done) return i;
  }
  return milestones.length - 1;
}

export function nextAdminAction(
  row: OohQuotePipelineRow,
): AdminPipelineActionKey | null {
  if (pipelineException(row)) return null;
  if (canShowSendQuote(row)) {
    return row.status === "draft" ? "sendQuote" : "resendQuote";
  }
  if (canShowBookingConfirm(row)) return "bookingConfirm";
  if (canShowAwaitingSignature(row)) return "awaitingSignature";
  if (canShowSendInvoice(row)) return "sendInvoice";
  if (canShowPaymentConfirm(row)) return "paymentConfirm";
  if (canShowContractConfirm(row)) return "contractConfirm";
  return null;
}

export function formatPipelineTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return iso.slice(0, 16).replace("T", " ");
}
