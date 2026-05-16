import { NextRequest } from "next/server";
import { CampaignStatus } from "@prisma/client";
import { upsertDraftSuccessCaseFromCampaign } from "@/lib/auto-success-case-from-campaign";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { linkCampaignOwnerByEmail } from "@/lib/link-campaign-owner";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id },
    include: {
      scheduleEvents: { orderBy: { startsAt: "asc" } },
      financialDocs: { orderBy: { createdAt: "desc" } },
      quoteRequests: { orderBy: { createdAt: "desc" }, take: 80 },
      proofPhotos: { orderBy: { createdAt: "desc" }, take: 40 },
      mediaBookings: {
        include: {
          media: {
            select: {
              name: true,
              location: true,
              image: true,
              dailyFootfall: true,
              impressions: true,
              visibilityScore: true,
              type: true,
              region: true,
              operatingHours: true,
              trafficPattern: true,
            },
          },
        },
      },
      account: true,
    },
  });
  if (!campaign) return json({ error: "Not found" }, 404);
  return json({ campaign });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const db = getPrisma();
  const existing = await db.campaign.findUnique({ where: { id } });
  if (!existing) return json({ error: "Not found" }, 404);

  const data: Record<string, unknown> = {};

  if (body.name != null) data.name = String(body.name).trim();
  if (body.clientCompany != null)
    data.clientCompany = String(body.clientCompany).trim();
  if (body.clientName != null) data.clientName = String(body.clientName).trim();
  if (body.clientEmail != null)
    data.clientEmail = String(body.clientEmail).trim();
  if (body.clientPhone !== undefined)
    data.clientPhone = String(body.clientPhone ?? "").trim() || null;
  if (body.notes !== undefined)
    data.notes = String(body.notes ?? "").trim() || null;
  if (body.budgetMin !== undefined)
    data.budgetMin =
      body.budgetMin == null ? null : Number(body.budgetMin) || null;
  if (body.budgetMax !== undefined)
    data.budgetMax =
      body.budgetMax == null ? null : Number(body.budgetMax) || null;
  if (body.startDate !== undefined)
    data.startDate = body.startDate ? new Date(String(body.startDate)) : null;
  if (body.endDate !== undefined)
    data.endDate = body.endDate ? new Date(String(body.endDate)) : null;
  if (body.accountId !== undefined)
    data.accountId = String(body.accountId ?? "").trim() || null;
  if (body.ownerUserId !== undefined)
    data.ownerUserId = String(body.ownerUserId ?? "").trim() || null;

  if (body.status != null) {
    const s = String(body.status);
    if (!Object.values(CampaignStatus).includes(s as CampaignStatus)) {
      return json({ error: "Invalid status" }, 400);
    }
    data.status = s as CampaignStatus;
  }

  try {
    const campaign = await db.campaign.update({
      where: { id },
      data,
    });
    if (body.clientEmail != null) {
      await linkCampaignOwnerByEmail(id, campaign.clientEmail);
    }
    const becameCompleted =
      campaign.status === CampaignStatus.completed &&
      existing.status !== CampaignStatus.completed;
    if (becameCompleted) {
      void upsertDraftSuccessCaseFromCampaign(id).catch((err) => {
        console.error("[campaigns] auto success case draft", err);
      });
    }
    return json({ campaign });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  try {
    await db.campaign.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
