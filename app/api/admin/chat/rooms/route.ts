import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  const db = getPrisma();
  const rows = await db.chatRoom.findMany({
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    take: 100,
    include: {
      media: { select: { id: true, name: true } },
      advertiser: { select: { id: true, email: true, name: true, company: true } },
      owner: { select: { id: true, email: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { bodySanitized: true, createdAt: true, contactBlocked: true },
      },
      _count: { select: { messages: true } },
    },
  });

  return json({
    items: rows.map((r) => ({
      id: r.id,
      mediaName: r.media.name,
      advertiser: {
        id: r.advertiser.id,
        email: r.advertiser.email,
        name: r.advertiser.name,
        company: r.advertiser.company,
      },
      owner: {
        id: r.owner.id,
        email: r.owner.email,
        name: r.owner.name,
      },
      status: r.status,
      messageCount: r._count.messages,
      lastMessage: r.messages[0]?.bodySanitized ?? null,
      lastMessageAt:
        r.lastMessageAt?.toISOString() ?? r.createdAt.toISOString(),
      contactBlockedLast: r.messages[0]?.contactBlocked ?? false,
      ownerFirstReplyAt: r.ownerFirstReplyAt?.toISOString() ?? null,
      oohQuoteId: r.oohQuoteId,
    })),
  });
}
