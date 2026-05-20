import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { daysSince, PIPELINE_STAGES } from "@/lib/crm-pipeline";
import { syncPipelineCardsFromSources } from "@/lib/crm-pipeline-sync";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  await syncPipelineCardsFromSources();
  const db = getPrisma();

  const cards = await db.pipelineCard.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userId: true,
      crmAccountId: true,
      contactInquiryId: true,
      oohQuoteId: true,
      sourceType: true,
      company: true,
      contactName: true,
      email: true,
      assignedTo: true,
      stage: true,
      expectedAmount: true,
      lastContactAt: true,
      firstInquiryAt: true,
      stageChangedAt: true,
      quoteSentAt: true,
      tags: true,
    },
  });

  const columns = PIPELINE_STAGES.map((stage) => {
    const stageCards = cards
      .filter((c) => c.stage === stage)
      .map((c) => {
        const ref =
          c.lastContactAt ?? c.stageChangedAt ?? c.firstInquiryAt;
        return {
          id: c.id,
          userId: c.userId,
          crmAccountId: c.crmAccountId,
          contactInquiryId: c.contactInquiryId,
          oohQuoteId: c.oohQuoteId,
          sourceType: c.sourceType,
          company: c.company,
          contactName: c.contactName,
          email: c.email,
          assignedTo: c.assignedTo,
          expectedAmountWon: c.expectedAmount,
          daysSinceContact: daysSince(ref),
          tags: c.tags,
        };
      });
    const totalAmount = stageCards.reduce(
      (s, c) => s + c.expectedAmountWon,
      0,
    );
    return { stage, cards: stageCards, totalAmount, count: stageCards.length };
  });

  return json({ columns, synced: cards.length });
}
