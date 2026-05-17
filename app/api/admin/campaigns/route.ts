import { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { linkCampaignOwnerByEmail } from "@/lib/link-campaign-owner";
import { formatDbApiError } from "@/lib/format-db-api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  try {
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
  } catch (e) {
    const { error, code } = formatDbApiError(e);
    return json({ error, code }, 503);
  }
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

  let db;
  try {
    db = getPrisma();
  } catch (e) {
    const { error, code } = formatDbApiError(e);
    return json({ error, code }, 503);
  }

  const accountId = String(body.accountId ?? "").trim() || null;
  if (accountId) {
    const acc = await db.crmAccount.findUnique({ where: { id: accountId } });
    if (!acc) return json({ error: "CRM account not found" }, 400);
  }

  let campaign;
  try {
    campaign = await db.campaign.create({
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
  } catch (e) {
    const { error, code } = formatDbApiError(e);
    return json({ error, code }, 503);
  }

  await linkCampaignOwnerByEmail(campaign.id, campaign.clientEmail);
  const linked = await db.campaign.findUnique({ where: { id: campaign.id } });

  return json({ campaign: linked ?? campaign }, 201);
}
