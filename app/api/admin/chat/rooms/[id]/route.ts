import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const denied = assertAdminDb(request);
  if (denied) return denied;

  const { id } = await params;
  const db = getPrisma();
  const room = await db.chatRoom.findUnique({
    where: { id },
    include: {
      media: { select: { id: true, name: true, location: true } },
      advertiser: {
        select: { id: true, email: true, name: true, company: true, phone: true },
      },
      owner: { select: { id: true, email: true, name: true, phone: true } },
      oohQuote: { select: { id: true, status: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });

  if (!room) return json({ error: "not_found" }, 404);

  return json({
    room: {
      id: room.id,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
      ownerFirstReplyAt: room.ownerFirstReplyAt?.toISOString() ?? null,
      media: room.media,
      advertiser: room.advertiser,
      owner: room.owner,
      oohQuoteId: room.oohQuoteId,
      oohQuoteStatus: room.oohQuote?.status ?? null,
    },
    messages: room.messages.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      displayLabel: m.displayLabel,
      body: m.body,
      bodySanitized: m.bodySanitized,
      contactBlocked: m.contactBlocked,
      isAutoReply: m.isAutoReply,
      attachmentUrl: m.attachmentUrl,
      sender: m.sender
        ? { id: m.sender.id, email: m.sender.email, name: m.sender.name }
        : null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
