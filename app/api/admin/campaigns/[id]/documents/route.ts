import { NextRequest } from "next/server";
import {
  FinancialDocKind,
  FinancialDocStatus,
} from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;
  const db = getPrisma();
  const docs = await db.campaignFinancialDoc.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });
  return json({ documents: docs });
}

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id: campaignId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const kind = String(body.kind ?? "");
  if (!Object.values(FinancialDocKind).includes(kind as FinancialDocKind)) {
    return json({ error: "Invalid kind" }, 400);
  }
  const title = String(body.title ?? "").trim();
  if (!title) return json({ error: "Title required" }, 400);

  let status: FinancialDocStatus = FinancialDocStatus.draft;
  if (body.status != null) {
    const s = String(body.status);
    if (Object.values(FinancialDocStatus).includes(s as FinancialDocStatus)) {
      status = s as FinancialDocStatus;
    }
  }

  const db = getPrisma();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return json({ error: "Campaign not found" }, 404);

  const doc = await db.campaignFinancialDoc.create({
    data: {
      campaignId,
      kind: kind as FinancialDocKind,
      title,
      amountKrw:
        body.amountKrw != null ? Number(body.amountKrw) || null : null,
      status,
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
      documentUrl: String(body.documentUrl ?? "").trim() || null,
      paidAt: body.paidAt ? new Date(String(body.paidAt)) : null,
    },
  });
  return json({ document: doc }, 201);
}
