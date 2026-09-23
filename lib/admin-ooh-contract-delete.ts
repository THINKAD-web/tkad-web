import {
  OoHQuoteStatus,
  OohContractStatus,
  type PrismaClient,
} from "@prisma/client";
import { releaseHoldsForQuote } from "@/lib/ooh-quote-booking-hold";

export class AdminContractDeleteError extends Error {
  constructor(
    readonly code:
      | "not_found"
      | "signed_requires_ack"
      | "quote_locked"
      | "campaign_linked",
    message: string,
  ) {
    super(message);
    this.name = "AdminContractDeleteError";
  }
}

const LOCKED_QUOTE_STATUSES = new Set<OoHQuoteStatus>([
  OoHQuoteStatus.in_progress,
  OoHQuoteStatus.completed,
]);

const SIGNED_LIKE_CONTRACT = new Set<OohContractStatus>([
  OohContractStatus.signed,
  OohContractStatus.confirmed,
]);

/** 계약 행 + 견적을 DB에서 제거 (테스트·오입력 정리). 홀드는 해제 후 삭제. */
export async function deleteAdminOohContractByContractId(
  db: PrismaClient,
  contractId: string,
  opts?: { acknowledgeSigned?: boolean },
): Promise<{ quoteId: string }> {
  const contract = await db.oohContract.findUnique({
    where: { id: contractId },
    include: {
      ooHQuote: {
        select: {
          id: true,
          status: true,
          campaignId: true,
        },
      },
    },
  });
  if (!contract?.ooHQuote) {
    throw new AdminContractDeleteError("not_found", "not_found");
  }

  const quote = contract.ooHQuote;

  if (SIGNED_LIKE_CONTRACT.has(contract.status) && !opts?.acknowledgeSigned) {
    throw new AdminContractDeleteError(
      "signed_requires_ack",
      "signed_requires_ack",
    );
  }

  if (LOCKED_QUOTE_STATUSES.has(quote.status) && !opts?.acknowledgeSigned) {
    throw new AdminContractDeleteError("quote_locked", "quote_locked");
  }

  if (quote.campaignId && !opts?.acknowledgeSigned) {
    throw new AdminContractDeleteError(
      "campaign_linked",
      "campaign_linked",
    );
  }

  await releaseHoldsForQuote(db, quote.id, "admin_delete_contract");
  await db.ooHQuote.delete({ where: { id: quote.id } });

  return { quoteId: quote.id };
}
