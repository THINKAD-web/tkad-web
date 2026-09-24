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
  parseContractInviteSendLog,
  type ContractInviteSendEntry,
} from "@/lib/contract-invite-log";
import { sendContractInviteEmail } from "@/lib/contract-invite-email";
import {
  createHoldsForQuote,
  isBookingHoldConflictError,
  isQuoteHoldDatesRequiredError,
} from "@/lib/ooh-quote-booking-hold";
import type { StandaloneContractPreviewInput } from "@/lib/standalone-contract";
import { catalogSupplyWonForPeriod } from "@/lib/ooh-contract-context";
import { inclusiveCampaignDays } from "@/lib/admin-quote-calc";
import { normalizeOohQuoteTotalAmountInput } from "@/lib/ooh-quote-amount";

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
    extraProductionWon: input.extraProductionWon,
    extraInstallWon: input.extraInstallWon,
    extraOtherWon: input.extraOtherWon,
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
    totalAmount: normalizeOohQuoteTotalAmountInput(input.totalAmountManwon),
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
  emailSkipReason?: "not_configured" | "send_failed";
  emailDetail?: string;
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

  const start = parseIsoDate(input.startDate);
  const end = parseIsoDate(input.endDate);
  const mediaRows = await db.media.findMany({
    where: { id: { in: input.mediaIds } },
    select: {
      id: true,
      name: true,
      location: true,
      price: true,
      pricePeriod: true,
      width: true,
      height: true,
    },
  });
  const order = new Map(input.mediaIds.map((id, i) => [id, i]));
  mediaRows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  const days = Math.max(1, inclusiveCampaignDays(start, end));
  const lines = mediaRows.map((m) => {
    const supply = catalogSupplyWonForPeriod({
      price: m.price,
      pricePeriod: m.pricePeriod,
      start,
      end,
    });
    const spec = [m.width, m.height].filter(Boolean).join("×");
    return {
      mediaId: m.id,
      mediaName: m.name,
      location: m.location,
      periodDays: days,
      unitPriceWon: supply,
      lineSupplyWon: supply,
      impressions: 0,
      quantityLabel: spec,
    };
  });
  const subtotalWon = lines.reduce((s, l) => s + l.lineSupplyWon, 0);
  const vatWon = Math.round(subtotalWon * 0.1);
  await db.ooHQuote.update({
    where: { id: quote.id },
    data: {
      quoteBreakdown: {
        lines,
        subtotalWon,
        discountRate: 0,
        discountWon: 0,
        supplyWon: subtotalWon,
        vatWon,
        totalWon: subtotalWon + vatWon,
        issuedAt: new Date().toISOString(),
      },
    },
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
  const inviteEmail = await sendContractInviteEmail({
    to: input.clientEmail.trim(),
    clientName: input.clientName.trim(),
    locale,
    quoteId: quote.id,
  });
  const emailed = inviteEmail.sent;

  let inviteLog = parseContractInviteSendLog(null);
  if (emailed) {
    const entry: ContractInviteSendEntry = {
      sentAt: new Date().toISOString(),
      to: input.clientEmail.trim(),
      kind: "initial",
    };
    inviteLog = appendContractInviteSendLog(null, entry);
    await db.oohContract.update({
      where: { id: contract.id },
      data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
    });
  }

  return {
    quoteId: quote.id,
    contractId: contract.id,
    emailed,
    inviteLog,
    emailSkipReason: inviteEmail.skipReason,
    emailDetail: inviteEmail.detail,
  };
}

export async function resendContractInvite(
  db: PrismaClient,
  contractId: string,
): Promise<{
  emailed: boolean;
  inviteLog: ContractInviteSendEntry[];
  quoteId: string;
  emailSkipReason?: "not_configured" | "send_failed";
  emailDetail?: string;
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

  const inviteEmail = await sendContractInviteEmail({
    to,
    clientName: row.clientName,
    locale,
    quoteId: row.id,
  });
  const emailed = inviteEmail.sent;

  let inviteLog = parseContractInviteSendLog(contract.inviteSendLog);
  if (emailed) {
    const entry: ContractInviteSendEntry = {
      sentAt: new Date().toISOString(),
      to,
      kind: "resend",
    };
    inviteLog = appendContractInviteSendLog(contract.inviteSendLog, entry);
    await db.oohContract.update({
      where: { id: contract.id },
      data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
    });
  }

  return {
    emailed,
    inviteLog,
    quoteId: row.id,
    emailSkipReason: inviteEmail.skipReason,
    emailDetail: inviteEmail.detail,
  };
}
