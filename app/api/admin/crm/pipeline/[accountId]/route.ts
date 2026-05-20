import { NextRequest } from "next/server";
import { SalesPipelineStage } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { PIPELINE_STAGE_LABEL } from "@/lib/crm-pipeline";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ accountId: string }> };

/** accountId = PipelineCard.id */
export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { accountId: cardId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const stage = String(body.pipelineStage ?? "");
  if (!Object.values(SalesPipelineStage).includes(stage as SalesPipelineStage)) {
    return json({ error: "Invalid pipelineStage" }, 400);
  }

  const db = getPrisma();
  const existing = await db.pipelineCard.findUnique({
    where: { id: cardId },
    select: { company: true, crmAccountId: true },
  });
  if (!existing) return json({ error: "Not found" }, 404);

  const label = PIPELINE_STAGE_LABEL[stage as SalesPipelineStage].ko;
  const now = new Date();
  const card = await db.pipelineCard.update({
    where: { id: cardId },
    data: {
      stage: stage as SalesPipelineStage,
      stageChangedAt: now,
      lastContactAt: now,
      ...(stage === "quote_sent" ? { quoteSentAt: now } : {}),
      ...(body.expectedAmountWon != null &&
      Number.isFinite(Number(body.expectedAmountWon))
        ? { expectedAmount: Math.round(Number(body.expectedAmountWon)) }
        : {}),
    },
  });

  if (existing.crmAccountId) {
    await db.crmAccount.update({
      where: { id: existing.crmAccountId },
      data: {
        pipelineStage: stage as SalesPipelineStage,
        stageChangedAt: now,
        lastContactAt: now,
        ...(stage === "quote_sent" ? { quoteSentAt: now } : {}),
      },
    });
    await db.crmContactLog.create({
      data: {
        accountId: existing.crmAccountId,
        channel: "system",
        kind: "pipeline_change",
        summary: `${existing.company} → ${label}`,
      },
    });
  }

  return json({ card });
}
