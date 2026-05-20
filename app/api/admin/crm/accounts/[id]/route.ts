import { NextRequest } from "next/server";
import { CrmTier, SalesPipelineStage } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { updatePipelineStage } from "@/lib/crm-customer-profile";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;
  const db = getPrisma();
  const account = await db.crmAccount.findUnique({
    where: { id },
    include: {
      contactLogs: { orderBy: { createdAt: "desc" }, take: 100 },
      notes: { orderBy: { updatedAt: "desc" }, take: 100 },
      followUps: { orderBy: { dueAt: "asc" }, take: 50 },
      campaigns: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          quoteRequests: { select: { mediaIds: true }, take: 30 },
        },
      },
    },
  });
  if (!account) return json({ error: "Not found" }, 404);

  function parseMediaIds(raw: string): string[] {
    const t = raw.trim();
    if (t.startsWith("[")) {
      try {
        const arr = JSON.parse(t) as unknown;
        if (Array.isArray(arr)) {
          return arr.map((x) => String(x)).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
    }
    return t.split(/[,\s]+/).filter(Boolean);
  }

  const pickCounts = new Map<string, number>();
  for (const c of account.campaigns) {
    for (const q of c.quoteRequests) {
      for (const mid of parseMediaIds(q.mediaIds)) {
        pickCounts.set(mid, (pickCounts.get(mid) ?? 0) + 1);
      }
    }
  }
  const sortedPicks = [...pickCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mediaIds = sortedPicks.slice(0, 15).map(([mid]) => mid);
  const medias =
    mediaIds.length > 0
      ? await db.media.findMany({
          where: { id: { in: mediaIds } },
          select: { id: true, name: true, type: true },
        })
      : [];
  const nameById = new Map(medias.map((m) => [m.id, m]));
  const preferredMedia = sortedPicks.slice(0, 10).map(([mid, picks]) => {
    const m = nameById.get(mid);
    return {
      id: mid,
      name: m?.name ?? mid,
      type: m?.type ?? "—",
      picks,
    };
  });

  return json({ account, preferredMedia });
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

  const data: Record<string, unknown> = {};
  if (body.company != null) data.company = String(body.company).trim();
  if (body.name != null) data.name = String(body.name).trim();
  if (body.phone !== undefined)
    data.phone = String(body.phone ?? "").trim() || null;
  if (body.tier != null) {
    const t = String(body.tier);
    if (!Object.values(CrmTier).includes(t as CrmTier)) {
      return json({ error: "Invalid tier" }, 400);
    }
    data.tier = t as CrmTier;
  }
  if (body.assignedTo !== undefined)
    data.assignedTo = String(body.assignedTo ?? "").trim() || null;
  if (body.expectedAmountWon != null) {
    const n = Number(body.expectedAmountWon);
    if (Number.isFinite(n) && n >= 0) data.expectedAmountWon = Math.round(n);
  }
  if (body.tags != null && Array.isArray(body.tags)) {
    data.tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
  }
  if (body.touchContact === true) data.lastContactAt = new Date();

  const db = getPrisma();
  try {
    if (body.pipelineStage != null) {
      const s = String(body.pipelineStage);
      if (!Object.values(SalesPipelineStage).includes(s as SalesPipelineStage)) {
        return json({ error: "Invalid pipelineStage" }, 400);
      }
      const account = await updatePipelineStage(id, s as SalesPipelineStage);
      if (Object.keys(data).length > 0) {
        await db.crmAccount.update({ where: { id }, data });
      }
      return json({ account });
    }
    const account = await db.crmAccount.update({ where: { id }, data });
    return json({ account });
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
    await db.crmAccount.delete({ where: { id } });
    return json({ ok: true });
  } catch {
    return json({ error: "Not found" }, 404);
  }
}
