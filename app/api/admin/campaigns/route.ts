import { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const db = getPrisma();
  const list = await db.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          scheduleEvents: true,
          financialDocs: true,
          quoteRequests: true,
        },
      },
    },
  });
  return json({ campaigns: list });
}

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = String(body.name ?? "").trim();
  const clientCompany = String(body.clientCompany ?? "").trim();
  const clientName = String(body.clientName ?? "").trim();
  const clientEmail = String(body.clientEmail ?? "").trim();
  if (!name || !clientCompany || !clientName || !clientEmail) {
    return json({ error: "Missing required fields" }, 400);
  }

  const statusRaw = String(body.status ?? "proposal");
  const status = Object.values(CampaignStatus).includes(statusRaw as CampaignStatus)
    ? (statusRaw as CampaignStatus)
    : CampaignStatus.proposal;

  const db = getPrisma();
  const accountId = String(body.accountId ?? "").trim() || null;
  if (accountId) {
    const acc = await db.crmAccount.findUnique({ where: { id: accountId } });
    if (!acc) return json({ error: "CRM account not found" }, 400);
  }

  const campaign = await db.campaign.create({
    data: {
      name,
      clientCompany,
      clientName,
      clientEmail,
      clientPhone: String(body.clientPhone ?? "").trim() || null,
      status,
      budgetMin:
        body.budgetMin != null ? Number(body.budgetMin) || null : null,
      budgetMax:
        body.budgetMax != null ? Number(body.budgetMax) || null : null,
      startDate: body.startDate ? new Date(String(body.startDate)) : null,
      endDate: body.endDate ? new Date(String(body.endDate)) : null,
      notes: String(body.notes ?? "").trim() || null,
      accountId,
    },
  });

  await linkCampaignOwnerByEmail(campaign.id, campaign.clientEmail);
  const linked = await db.campaign.findUnique({ where: { id: campaign.id } });

  return json({ campaign: linked ?? campaign }, 201);
}
