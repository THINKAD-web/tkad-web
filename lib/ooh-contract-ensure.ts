import {
  OoHQuoteStatus,
  OohContractStatus,
  type PrismaClient,
} from "@prisma/client";

const PIPELINE_CONTRACT: OoHQuoteStatus[] = [
  OoHQuoteStatus.booking_confirmed,
  OoHQuoteStatus.invoice_sent,
  OoHQuoteStatus.payment_pending,
  OoHQuoteStatus.payment_confirmed,
  OoHQuoteStatus.contract_confirmed,
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
];

/** 견적이 계약·청구 단계에 있으면 OohContract 행을 보장합니다. */
export async function ensureOohContractExists(
  db: PrismaClient,
  ooHQuoteId: string,
  quoteStatus: OoHQuoteStatus,
) {
  if (!PIPELINE_CONTRACT.includes(quoteStatus)) {
    return null;
  }
  return db.oohContract.upsert({
    where: { ooHQuoteId },
    create: {
      ooHQuoteId,
      contractPdfUrl: "",
      status: OohContractStatus.pending,
    },
    update: {},
  });
}
