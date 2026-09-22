import {
  OoHQuoteStatus,
  OohContractStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import {
  mergeOohContractMetaIntoAdminNote,
  type OohContractMeta,
} from "@/lib/ooh-contract-meta";
import {
  appendContractInviteSendLog,
  type ContractInviteSendEntry,
} from "@/lib/contract-invite-log";
import { sendContractInviteEmail } from "@/lib/contract-invite-email";
import {
  createHoldsForQuote,
  isBookingHoldConflictError,
  isQuoteHoldDatesRequiredError,
} from "@/lib/ooh-quote-booking-hold";
import type { StandaloneContractPreviewInput } from "@/lib/standalone-contract";

export const STANDALONE_OOH_SOURCE_NOTE = "[[ooh-contract-source:standalone]]";

export type StandaloneContractSendInput = StandaloneContractPreviewInput & {
  clientEmail: string;
  mediaIds: string[];
  draftId?: string;
};

export class StandaloneContractSendError extends Error {
  constructor(
    readonly code:
      | "VALIDATION"
      | "BOOKING_CONFLICT"
      | "DATES_REQUIRED"
      | "MEDIA_REQUIRED",
    message: string,
    readonly conflicts?: unknown,
  ) {
    super(message);
    this.name = "StandaloneContractSendError";
  }
}

function parseIsoDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new StandaloneContractSendError("VALIDATION", "invalid_date");
  }
  return d;
}

export function buildStandaloneOoHQuoteCreateData(
  input: StandaloneContractSendInput,
): Prisma.OoHQuoteCreateInput {
  const meta: OohContractMeta = {
    clientRepName: input.clientRepName?.trim() || input.clientName.trim(),
    clientAddress: input.clientAddress?.trim() || undefined,
    campaignName: input.campaignName?.trim() || undefined,
    productionCost: input.productionCost?.trim() || undefined,
    mediaCount: input.mediaCount?.trim() || undefined,
    paymentMethod: input.paymentMethod?.trim() || undefined,
  };

  const humanNote = [
    STANDALONE_OOH_SOURCE_NOTE,
    input.draftId ? `draft:${input.draftId}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const now = new Date();
  const locale = input.locale === "en" ? "en" : "ko";

  return {
    status: OoHQuoteStatus.booking_confirmed,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim(),
    clientPhone: input.clientPhone?.trim() || null,
    clientCompany: input.clientCompany?.trim() || null,
    mediaIds: input.mediaIds,
    totalAmount: input.totalAmountManwon,
    period: input.period.trim(),
    startDate: input.startDate ? parseIsoDate(input.startDate) : null,
    endDate: input.endDate ? parseIsoDate(input.endDate) : null,
    locale,
    pdfTemplate: "default",
    bookingRequestedAt: now,
    bookingConfirmedAt: now,
    adminNote: mergeOohContractMetaIntoAdminNote(humanNote, meta),
    oohContract: {
      create: {
        contractPdfUrl: "",
        status: OohContractStatus.pending,
        specialTerms: input.specialTerms?.trim() || null,
      },
    },
  };
}

export async function createStandaloneContractSend(
  db: PrismaClient,
  input: StandaloneContractSendInput,
  opts?: { holdForce?: boolean },
): Promise<{
  quoteId: string;
  contractId: string;
  emailed: boolean;
  inviteLog: ContractInviteSendEntry[];
}> {
  if (!input.mediaIds.length) {
    throw new StandaloneContractSendError(
      "MEDIA_REQUIRED",
      "At least one media is required",
    );
  }
  if (!input.startDate || !input.endDate) {
    throw new StandaloneContractSendError(
      "DATES_REQUIRED",
      "startDate and endDate required for contract send",
    );
  }

  const quote = await db.ooHQuote.create({
    data: buildStandaloneOoHQuoteCreateData(input),
    include: { oohContract: true },
  });

  const contract = quote.oohContract;
  if (!contract) {
    throw new Error("contract_row_missing");
  }

  try {
    await createHoldsForQuote(db, quote, { force: opts?.holdForce === true });
  } catch (e) {
    await db.ooHQuote.delete({ where: { id: quote.id } }).catch(() => {});
    if (isBookingHoldConflictError(e)) {
      throw new StandaloneContractSendError(
        "BOOKING_CONFLICT",
        e.message,
        e.conflicts,
      );
    }
    if (isQuoteHoldDatesRequiredError(e)) {
      throw new StandaloneContractSendError("DATES_REQUIRED", e.message);
    }
    throw e;
  }

  const locale = input.locale === "en" ? "en" : "ko";
  const emailed = await sendContractInviteEmail({
    to: input.clientEmail.trim(),
    clientName: input.clientName.trim(),
    locale,
    quoteId: quote.id,
  });

  const entry: ContractInviteSendEntry = {
    sentAt: new Date().toISOString(),
    to: input.clientEmail.trim(),
    kind: "initial",
  };
  const inviteLog = appendContractInviteSendLog(null, entry);
  await db.oohContract.update({
    where: { id: contract.id },
    data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
  });

  return {
    quoteId: quote.id,
    contractId: contract.id,
    emailed,
    inviteLog,
  };
}

export async function resendContractInvite(
  db: PrismaClient,
  contractId: string,
): Promise<{
  emailed: boolean;
  inviteLog: ContractInviteSendEntry[];
  quoteId: string;
}> {
  const contract = await db.oohContract.findUnique({
    where: { id: contractId },
    include: { ooHQuote: true },
  });
  if (!contract?.ooHQuote) {
    throw new StandaloneContractSendError("VALIDATION", "not_found");
  }
  if (contract.status !== OohContractStatus.pending) {
    throw new StandaloneContractSendError(
      "VALIDATION",
      "contract_not_pending",
    );
  }

  const row = contract.ooHQuote;
  const locale = row.locale === "en" ? "en" : "ko";
  const to = row.clientEmail?.trim();
  if (!to) {
    throw new StandaloneContractSendError("VALIDATION", "missing_client_email");
  }

  const emailed = await sendContractInviteEmail({
    to,
    clientName: row.clientName,
    locale,
    quoteId: row.id,
  });

  const entry: ContractInviteSendEntry = {
    sentAt: new Date().toISOString(),
    to,
    kind: "resend",
  };
  const inviteLog = appendContractInviteSendLog(contract.inviteSendLog, entry);
  await db.oohContract.update({
    where: { id: contract.id },
    data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
  });

  return { emailed, inviteLog, quoteId: row.id };
}
