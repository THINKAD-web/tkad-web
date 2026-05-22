import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/admin-guard";
import { awardPoints, getPointBalance } from "@/lib/points";
import { getAdminPointStats } from "@/lib/points-expiry-cron";
import type { PointEventType } from "@prisma/client";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: NextRequest) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const stats = await getAdminPointStats();

  const users = q
    ? await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 30,
        select: {
          id: true,
          email: true,
          name: true,
          userPoint: { select: { balance: true, totalEarned: true, totalSpent: true } },
        },
      })
    : await prisma.user.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          userPoint: { select: { balance: true, totalEarned: true, totalSpent: true } },
        },
      });

  return json({ ok: true, stats, users });
}

const AdjustBody = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1).max(200),
});

const BulkBody = z.object({
  amount: z.number().int().positive(),
  description: z.string().min(1).max(200),
  role: z.enum(["advertiser", "agency", "owner", "admin"]).optional(),
});

export async function POST(request: NextRequest) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = (body as { action?: string })?.action;

  if (action === "bulk") {
    const parsed = BulkBody.safeParse(body);
    if (!parsed.success) return json({ error: parsed.error.message }, 400);

    const users = await prisma.user.findMany({
      where: parsed.data.role ? { role: parsed.data.role } : { deletedAt: null },
      select: { id: true },
      take: 5000,
    });

    let count = 0;
    for (const u of users) {
      const refId = `bulk-${Date.now()}-${u.id.slice(-6)}`;
      const res = await awardPoints(u.id, "ADMIN_ADJUST", refId, {
        amountOverride: parsed.data.amount,
        description: parsed.data.description,
      });
      if (res.awarded) count += 1;
    }
    return json({ ok: true, count });
  }

  const parsed = AdjustBody.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.message }, 400);

  const { userId, amount, description } = parsed.data;
  const refId = `admin-${Date.now()}`;

  if (amount > 0) {
    const res = await awardPoints(userId, "ADMIN_ADJUST", refId, {
      amountOverride: amount,
      description,
    });
    return json({ ok: true, ...res });
  }

  const balance = await getPointBalance(userId);
  if (balance + amount < 0) {
    return json({ error: "잔액 부족" }, 400);
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.userPoint.upsert({
      where: { userId },
      create: { userId, balance: 0, totalSpent: Math.abs(amount) },
      update: {
        balance: { increment: amount },
        totalSpent: { increment: Math.abs(amount) },
      },
    });
    await tx.pointTransaction.create({
      data: {
        userId,
        type: "ADMIN_ADJUST" satisfies PointEventType,
        amount,
        description,
        refId,
        balanceAfter: updated.balance,
      },
    });
  });

  const newBalance = await getPointBalance(userId);
  return json({ ok: true, balance: newBalance, amount });
}
