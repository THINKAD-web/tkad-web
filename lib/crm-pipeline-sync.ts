import type { OoHQuoteStatus, PrismaClient, SalesPipelineStage } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export function oohQuoteStatusToStage(status: OoHQuoteStatus): SalesPipelineStage {
  switch (status) {
    case "draft":
      return "consulting";
    case "sent":
    case "expired":
      return "quote_sent";
    case "booking_requested":
    case "booking_pending":
    case "booking_confirmed":
    case "invoice_sent":
    case "payment_pending":
      return "contract_negotiation";
    case "payment_confirmed":
    case "contract_confirmed":
      return "contract_closed";
    case "in_progress":
      return "in_flight";
    case "completed":
      return "completed";
    case "cancelled":
      return "consulting";
    default:
      return "consulting";
  }
}

/** 단일 OoH 견적 상태 변경 후 연결된 PipelineCard stage 즉시 반영 */
export async function syncPipelineStageForOoHQuote(
  db: PrismaClient,
  quoteId: string,
): Promise<void> {
  const q = await db.ooHQuote.findUnique({
    where: { id: quoteId },
    include: { pipelineCard: true },
  });
  if (!q?.pipelineCard) return;

  const stage = oohQuoteStatusToStage(q.status);
  if (q.pipelineCard.stage === stage) return;

  await db.pipelineCard.update({
    where: { id: q.pipelineCard.id },
    data: {
      stage,
      expectedAmount: q.totalAmount,
      quoteSentAt: q.quotePdfSentAt ?? q.pipelineCard.quoteSentAt,
      lastContactAt: new Date(),
    },
  });
}

/** ContactInquiry + OoHQuote + CrmAccount → PipelineCard 동기화 */
export async function syncPipelineCardsFromSources(): Promise<number> {
  const db = getPrisma();
  let upserted = 0;

  const inquiries = await db.contactInquiry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { pipelineCard: true, oohQuote: true },
  });

  for (const inq of inquiries) {
    if (inq.pipelineCard) continue;
    const email = inq.email?.trim().toLowerCase() || null;
    const account = email
      ? await db.crmAccount.findUnique({ where: { email } })
      : null;
    await db.pipelineCard.create({
      data: {
        stage: inq.oohQuote
          ? oohQuoteStatusToStage(inq.oohQuote.status)
          : "new_inquiry",
        company: inq.company,
        contactName: inq.name,
        email,
        phone: inq.phone,
        expectedAmount: inq.oohQuote?.totalAmount ?? 0,
        assignedTo: account?.assignedTo ?? null,
        firstInquiryAt: inq.createdAt,
        lastContactAt: inq.createdAt,
        quoteSentAt: inq.oohQuote?.quotePdfSentAt ?? null,
        sourceType: "inquiry",
        contactInquiryId: inq.id,
        oohQuoteId: inq.oohQuote?.id ?? null,
        crmAccountId: account?.id ?? null,
        userId: account?.userId ?? null,
      },
    });
    upserted += 1;
  }

  const quotes = await db.ooHQuote.findMany({
    where: { status: { not: "cancelled" } },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { pipelineCard: true },
  });

  for (const q of quotes) {
    if (q.pipelineCard) {
      const stage = oohQuoteStatusToStage(q.status);
      if (q.pipelineCard.stage !== stage) {
        await db.pipelineCard.update({
          where: { id: q.pipelineCard.id },
          data: {
            stage,
            expectedAmount: q.totalAmount,
            quoteSentAt: q.quotePdfSentAt ?? q.pipelineCard.quoteSentAt,
            lastContactAt: new Date(),
          },
        });
      }
      continue;
    }
    const email = q.clientEmail.trim().toLowerCase();
    const account = await db.crmAccount.findUnique({ where: { email } });
    await db.pipelineCard.create({
      data: {
        stage: oohQuoteStatusToStage(q.status),
        company: q.clientCompany?.trim() || q.clientName,
        contactName: q.clientName,
        email,
        phone: q.clientPhone,
        expectedAmount: q.totalAmount,
        assignedTo: account?.assignedTo ?? null,
        firstInquiryAt: q.createdAt,
        lastContactAt: q.updatedAt,
        quoteSentAt: q.quotePdfSentAt,
        sourceType: "ooh_quote",
        oohQuoteId: q.id,
        contactInquiryId: q.contactInquiryId,
        crmAccountId: account?.id ?? null,
        userId: account?.userId ?? null,
      },
    });
    upserted += 1;
  }

  const accounts = await db.crmAccount.findMany({
    where: { pipelineCard: null },
    take: 150,
  });
  for (const acc of accounts) {
    await db.pipelineCard.create({
      data: {
        stage: acc.pipelineStage,
        company: acc.company,
        contactName: acc.name,
        email: acc.email,
        phone: acc.phone,
        expectedAmount: acc.expectedAmountWon ?? 0,
        assignedTo: acc.assignedTo,
        firstInquiryAt: acc.firstInquiryAt,
        lastContactAt: acc.lastContactAt,
        quoteSentAt: acc.quoteSentAt,
        stageChangedAt: acc.stageChangedAt,
        tags: acc.tags,
        sourceType: "account",
        crmAccountId: acc.id,
        userId: acc.userId,
      },
    });
    upserted += 1;
  }

  return upserted;
}
