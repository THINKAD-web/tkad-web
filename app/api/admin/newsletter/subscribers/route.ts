import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "active";
  const where = status === "all" ? {} : status === "unsubscribed" ? { unsubscribedAt: { not: null } } : { unsubscribedAt: null };
  const rows = await db.newsletterSubscriber.findMany({
    where,
    orderBy: [{ unsubscribedAt: "asc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      email: true,
      locale: true,
      source: true,
      unsubscribedAt: true,
      lastSentAt: true,
      createdAt: true,
    },
  });
  return json({
    items: rows.map((r) => ({
      id: r.id,
      email: r.email,
      locale: r.locale,
      source: r.source,
      isActive: r.unsubscribedAt == null,
      unsubscribedAt: r.unsubscribedAt?.toISOString() ?? null,
      lastSentAt: r.lastSentAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total: rows.length,
  });
}

export async function DELETE(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "id required" }, 400);
  const db = getPrisma();
  await db.newsletterSubscriber.update({
    where: { id },
    data: { unsubscribedAt: new Date() },
  });
  return json({ success: true });
}
