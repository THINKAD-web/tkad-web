import { NextRequest } from "next/server";
import { CrmTier, SalesPipelineStage } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import {
  buildCustomerTimeline,
  computeCustomerLifetimeSpend,
  findOrCreateCrmAccountForUser,
} from "@/lib/crm-customer-profile";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { userId } = await params;

  const pair = await findOrCreateCrmAccountForUser(userId);
  if (!pair) return json({ error: "User not found" }, 404);

  const { user, account } = pair;
  const db = getPrisma();

  const [lifetimeSpend, timeline, campaigns, inquiries] = await Promise.all([
    computeCustomerLifetimeSpend(user.email, user.id),
    buildCustomerTimeline(account.id, user.id),
    db.campaign.findMany({
      where: { OR: [{ ownerUserId: user.id }, { clientEmail: user.email }] },
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: {
        id: true,
        name: true,
        status: true,
        budgetMax: true,
        updatedAt: true,
      },
    }),
    db.contactInquiry.findMany({
      where: { email: user.email },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, company: true, message: true, createdAt: true },
    }),
  ]);

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      company: user.company,
      createdAt: user.createdAt.toISOString(),
    },
    account: {
      ...account,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      lastContactAt: account.lastContactAt?.toISOString() ?? null,
      firstInquiryAt: account.firstInquiryAt?.toISOString() ?? null,
      quoteSentAt: account.quoteSentAt?.toISOString() ?? null,
      stageChangedAt: account.stageChangedAt?.toISOString() ?? null,
    },
    lifetimeSpend,
    timeline,
    campaigns: campaigns.map((c) => ({
      ...c,
      updatedAt: c.updatedAt.toISOString(),
    })),
    inquiries: inquiries.map((i) => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { userId } = await params;

  const pair = await findOrCreateCrmAccountForUser(userId);
  if (!pair) return json({ error: "User not found" }, 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const data: Record<string, unknown> = {};
  if (body.company != null) data.company = String(body.company).trim();
  if (body.name != null) data.name = String(body.name).trim();
  if (body.phone !== undefined)
    data.phone = String(body.phone ?? "").trim() || null;
  if (body.assignedTo !== undefined)
    data.assignedTo = String(body.assignedTo ?? "").trim() || null;
  if (body.expectedAmountWon != null) {
    const n = Number(body.expectedAmountWon);
    if (Number.isFinite(n) && n >= 0) data.expectedAmountWon = Math.round(n);
  }
  if (body.tags != null && Array.isArray(body.tags)) {
    data.tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (body.tier != null) {
    const t = String(body.tier);
    if (!Object.values(CrmTier).includes(t as CrmTier)) {
      return json({ error: "Invalid tier" }, 400);
    }
    data.tier = t as CrmTier;
  }
  if (body.pipelineStage != null) {
    const s = String(body.pipelineStage);
    if (!Object.values(SalesPipelineStage).includes(s as SalesPipelineStage)) {
      return json({ error: "Invalid stage" }, 400);
    }
    data.pipelineStage = s as SalesPipelineStage;
    data.stageChangedAt = new Date();
    data.lastContactAt = new Date();
    if (s === "quote_sent") data.quoteSentAt = new Date();
  }
  if (body.touchContact === true) {
    data.lastContactAt = new Date();
  }

  const db = getPrisma();
  const account = await db.crmAccount.update({
    where: { id: pair.account.id },
    data,
  });

  if (body.note != null && String(body.note).trim()) {
    const noteBody = String(body.note).trim();
    await db.customerNote.create({
      data: {
        userId: pair.user.id,
        crmAccountId: account.id,
        body: noteBody,
        kind: "note",
      },
    });
    await db.crmContactLog.create({
      data: {
        accountId: account.id,
        channel: "note",
        kind: "note",
        summary: noteBody.slice(0, 500),
      },
    });
    await db.crmAccount.update({
      where: { id: account.id },
      data: { lastContactAt: new Date() },
    });
    const card = await db.pipelineCard.findFirst({
      where: { crmAccountId: account.id },
    });
    if (card) {
      await db.pipelineCard.update({
        where: { id: card.id },
        data: { lastContactAt: new Date() },
      });
    }
  }

  if (data.tags || data.assignedTo !== undefined || data.pipelineStage) {
    const card = await db.pipelineCard.findFirst({
      where: { crmAccountId: account.id },
    });
    if (card) {
      await db.pipelineCard.update({
        where: { id: card.id },
        data: {
          ...(data.tags ? { tags: data.tags as string[] } : {}),
          ...(data.assignedTo !== undefined
            ? { assignedTo: data.assignedTo as string | null }
            : {}),
          ...(data.pipelineStage
            ? {
                stage: data.pipelineStage as SalesPipelineStage,
                stageChangedAt: new Date(),
              }
            : {}),
          ...(data.expectedAmountWon != null
            ? { expectedAmount: data.expectedAmountWon as number }
            : {}),
        },
      });
    }
  }

  return json({ account });
}
