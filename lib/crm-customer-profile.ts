import type { SalesPipelineStage } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

export async function findOrCreateCrmAccountForUser(userId: string) {
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      company: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  let account = await db.crmAccount.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }] },
  });

  if (!account) {
    const firstInquiry = await db.contactInquiry.findFirst({
      where: { email: user.email },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    account = await db.crmAccount.create({
      data: {
        userId: user.id,
        email: user.email.toLowerCase(),
        company: user.company?.trim() || user.name,
        name: user.name,
        phone: user.phone,
        firstInquiryAt: firstInquiry?.createdAt ?? user.createdAt,
        lastContactAt: new Date(),
      },
    });
  } else if (!account.userId) {
    account = await db.crmAccount.update({
      where: { id: account.id },
      data: { userId: user.id },
    });
  }

  return { user, account };
}

export async function computeCustomerLifetimeSpend(
  email: string,
  userId: string,
): Promise<number> {
  const db = getPrisma();
  const campaigns = await db.campaign.findMany({
    where: {
      OR: [{ ownerUserId: userId }, { clientEmail: email }],
    },
    include: {
      financialDocs: {
        where: { status: "paid" },
        select: { amountKrw: true },
      },
    },
  });

  let total = 0;
  for (const c of campaigns) {
    for (const d of c.financialDocs) {
      total += d.amountKrw ?? 0;
    }
    if (!c.financialDocs.length && c.budgetMax) {
      total += c.budgetMax;
    }
  }

  const quotes = await db.ooHQuote.findMany({
    where: {
      OR: [
        { clientEmail: email },
        { quoteRequest: { email } },
      ],
      paymentConfirmedAt: { not: null },
    },
    select: { paymentAmount: true },
  });
  for (const q of quotes) {
    if (q.paymentAmount) total += q.paymentAmount;
  }

  return total;
}

export async function buildCustomerTimeline(
  accountId: string,
  userId?: string | null,
) {
  const db = getPrisma();
  const [logs, notes, customerNotes] = await Promise.all([
    db.crmContactLog.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.crmNote.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    userId
      ? db.customerNote.findMany({
          where: { OR: [{ userId }, { crmAccountId: accountId }] },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : db.customerNote.findMany({
          where: { crmAccountId: accountId },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
  ]);

  const seen = new Set<string>();
  const items = [
    ...logs.map((l) => ({
      id: `log-${l.id}`,
      type: "contact" as const,
      kind: l.kind,
      channel: l.channel,
      body: l.summary,
      at: l.createdAt.toISOString(),
    })),
    ...notes.map((n) => ({
      id: `crmnote-${n.id}`,
      type: "note" as const,
      kind: "note",
      channel: null,
      body: n.body,
      at: n.createdAt.toISOString(),
    })),
    ...customerNotes.map((n) => ({
      id: `cnote-${n.id}`,
      type: "note" as const,
      kind: n.kind,
      channel: n.authorLabel,
      body: n.body,
      at: n.createdAt.toISOString(),
    })),
  ]
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => b.at.localeCompare(a.at));

  return items;
}

export async function updatePipelineStage(
  accountId: string,
  stage: SalesPipelineStage,
  summary?: string,
) {
  const db = getPrisma();
  const account = await db.crmAccount.update({
    where: { id: accountId },
    data: {
      pipelineStage: stage,
      stageChangedAt: new Date(),
      lastContactAt: new Date(),
      ...(stage === "quote_sent" ? { quoteSentAt: new Date() } : {}),
    },
  });

  await db.crmContactLog.create({
    data: {
      accountId,
      channel: "system",
      kind: "pipeline_change",
      summary: summary ?? `파이프라인 → ${stage}`,
    },
  });

  return account;
}
