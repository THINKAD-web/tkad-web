import {
  OoHQuoteStatus,
  OohContractSendMode,
  OohContractStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { z } from "zod";
import {
  appendContractInviteSendLog,
  type ContractInviteSendEntry,
} from "@/lib/contract-invite-log";
import { sendContractInviteEmail } from "@/lib/contract-invite-email";
import { sendContractAttachmentEmail } from "@/lib/contract-attachment-email";
import {
  fetchUploadedContractPdfVerified,
} from "@/lib/ooh-contract-upload-pdf";
import {
  createHoldsForQuote,
  isBookingHoldConflictError,
  isQuoteHoldDatesRequiredError,
} from "@/lib/ooh-quote-booking-hold";
import {
  StandaloneContractSendError,
} from "@/lib/standalone-contract-send";

export const UPLOAD_OOH_SOURCE_NOTE = "[[ooh-contract-source:upload]]";

const requiredClientEmail = z
  .string()
  .min(1)
  .max(254)
  .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), {
    message: "invalid_client_email",
  });

export const UploadContractSendBody = z.object({
  mode: z.enum(["uploaded_esign", "uploaded_attachment"]),
  uploadedPdfUrl: z.string().url().max(2048),
  uploadedPdfSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .transform((s) => s.toLowerCase()),
  uploadedPdfFileName: z.string().min(1).max(255),
  clientName: z.string().min(1).max(80),
  clientCompany: z.string().max(120).optional().default(""),
  clientPhone: z.string().max(40).optional().default(""),
  clientEmail: requiredClientEmail,
  locale: z.enum(["ko", "en"]).default("ko"),
  mediaIds: z.array(z.string().min(1).max(64)).max(50).default([]),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  totalAmountManwon: z.number().int().positive().max(999_999_999).optional(),
  force: z.boolean().optional().default(false),
});

export type UploadContractSendInput = z.infer<typeof UploadContractSendBody>;

function parseIsoDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new StandaloneContractSendError("VALIDATION", "invalid_date");
  }
  return d;
}

function validateUploadSendInput(input: UploadContractSendInput): void {
  const isEsign = input.mode === "uploaded_esign";
  if (isEsign) {
    if (!input.mediaIds.length) {
      throw new StandaloneContractSendError(
        "MEDIA_REQUIRED",
        "At least one media is required for e-sign upload",
      );
    }
    if (!input.startDate || !input.endDate) {
      throw new StandaloneContractSendError(
        "DATES_REQUIRED",
        "startDate and endDate required for e-sign upload",
      );
    }
  } else if (input.mediaIds.length > 0) {
    if (!input.startDate || !input.endDate) {
      throw new StandaloneContractSendError(
        "DATES_REQUIRED",
        "startDate and endDate required when media is selected",
      );
    }
  }
}

function buildPeriod(input: UploadContractSendInput): string {
  if (input.startDate && input.endDate) {
    return `${input.startDate} ~ ${input.endDate}`;
  }
  return "—";
}

export function buildUploadOoHQuoteCreateData(
  input: UploadContractSendInput,
): Prisma.OoHQuoteCreateInput {
  const locale = input.locale === "en" ? "en" : "ko";
  const now = new Date();
  const sendMode =
    input.mode === "uploaded_esign"
      ? OohContractSendMode.uploaded_esign
      : OohContractSendMode.uploaded_attachment;
  const contractStatus =
    input.mode === "uploaded_esign"
      ? OohContractStatus.pending
      : OohContractStatus.attachment_sent;
  const manwon = input.totalAmountManwon ?? 1;

  return {
    status: OoHQuoteStatus.booking_confirmed,
    clientName: input.clientName.trim(),
    clientEmail: input.clientEmail.trim(),
    clientPhone: input.clientPhone?.trim() || null,
    clientCompany: input.clientCompany?.trim() || null,
    mediaIds: input.mediaIds,
    totalAmount: manwon,
    period: buildPeriod(input),
    startDate: input.startDate ? parseIsoDate(input.startDate) : null,
    endDate: input.endDate ? parseIsoDate(input.endDate) : null,
    locale,
    pdfTemplate: "default",
    bookingRequestedAt: now,
    bookingConfirmedAt: now,
    adminNote: UPLOAD_OOH_SOURCE_NOTE,
    oohContract: {
      create: {
        contractPdfUrl: "",
        status: contractStatus,
        sendMode,
        uploadedPdfUrl: input.uploadedPdfUrl.trim(),
        uploadedPdfSha256: input.uploadedPdfSha256,
        uploadedPdfFileName: input.uploadedPdfFileName.trim(),
        documentSha256: input.uploadedPdfSha256,
      },
    },
  };
}

export async function createUploadContractSend(
  db: PrismaClient,
  input: UploadContractSendInput,
  opts?: { holdForce?: boolean },
): Promise<{
  quoteId: string;
  contractId: string;
  emailed: boolean;
  inviteLog: ContractInviteSendEntry[];
}> {
  validateUploadSendInput(input);

  await fetchUploadedContractPdfVerified(
    input.uploadedPdfUrl,
    input.uploadedPdfSha256,
  );

  const quote = await db.ooHQuote.create({
    data: buildUploadOoHQuoteCreateData(input),
    include: { oohContract: true },
  });

  const contract = quote.oohContract;
  if (!contract) {
    throw new Error("contract_row_missing");
  }

  if (input.mediaIds.length > 0) {
    try {
      await createHoldsForQuote(db, quote, {
        force: opts?.holdForce === true,
      });
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
  }

  const locale = input.locale === "en" ? "en" : "ko";
  const pdfBuf = await fetchUploadedContractPdfVerified(
    input.uploadedPdfUrl,
    input.uploadedPdfSha256,
  );

  let emailed = false;
  let entry: ContractInviteSendEntry;

  if (input.mode === "uploaded_esign") {
    emailed = await sendContractInviteEmail({
      to: input.clientEmail.trim(),
      clientName: input.clientName.trim(),
      locale,
      quoteId: quote.id,
    });
    entry = {
      sentAt: new Date().toISOString(),
      to: input.clientEmail.trim(),
      kind: "initial",
    };
  } else {
    emailed = await sendContractAttachmentEmail({
      to: input.clientEmail.trim(),
      clientName: input.clientName.trim(),
      locale,
      pdfBuffer: pdfBuf,
      fileName: input.uploadedPdfFileName,
    });
    entry = {
      sentAt: new Date().toISOString(),
      to: input.clientEmail.trim(),
      kind: "attachment_initial",
    };
  }

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

export async function resendUploadContractDelivery(
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

  const row = contract.ooHQuote;
  const locale = row.locale === "en" ? "en" : "ko";
  const to = row.clientEmail?.trim();
  if (!to) {
    throw new StandaloneContractSendError("VALIDATION", "missing_client_email");
  }

  if (contract.sendMode === OohContractSendMode.uploaded_attachment) {
    if (contract.status !== OohContractStatus.attachment_sent) {
      throw new StandaloneContractSendError(
        "VALIDATION",
        "contract_not_attachment_sent",
      );
    }
    if (!contract.uploadedPdfUrl) {
      throw new StandaloneContractSendError("VALIDATION", "missing_upload_pdf");
    }
    const pdfBuf = await fetchUploadedContractPdfVerified(
      contract.uploadedPdfUrl,
      contract.uploadedPdfSha256,
    );
    const emailed = await sendContractAttachmentEmail({
      to,
      clientName: row.clientName,
      locale,
      pdfBuffer: pdfBuf,
      fileName: contract.uploadedPdfFileName ?? "contract.pdf",
    });
    const entry: ContractInviteSendEntry = {
      sentAt: new Date().toISOString(),
      to,
      kind: "attachment_resend",
    };
    const inviteLog = appendContractInviteSendLog(contract.inviteSendLog, entry);
    await db.oohContract.update({
      where: { id: contract.id },
      data: { inviteSendLog: inviteLog as Prisma.InputJsonValue },
    });
    return { emailed, inviteLog, quoteId: row.id };
  }

  if (contract.sendMode === OohContractSendMode.uploaded_esign) {
    if (contract.status !== OohContractStatus.pending) {
      throw new StandaloneContractSendError(
        "VALIDATION",
        "contract_not_pending",
      );
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

  throw new StandaloneContractSendError("VALIDATION", "unsupported_send_mode");
}
