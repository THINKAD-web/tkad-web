import { z } from "zod";
import { ChatSenderRole } from "@prisma/client";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import {
  resolveChatParticipantSide,
  sendChatMessage,
} from "@/lib/chat-room-service";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  body: z.string().max(4000).optional(),
  attachmentUrl: z.string().url().optional().nullable(),
  attachmentType: z.enum(["image", "pdf"]).optional().nullable(),
  attachmentName: z.string().max(200).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);
    if (!isDatabaseConfigured()) return apiError("DB_UNAVAILABLE", 503);

    const { id: roomId } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const db = getPrisma();
    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        status: true,
        advertiserUserId: true,
        ownerUserId: true,
      },
    });
    if (!room) return apiError("NOT_FOUND", 404);
    if (room.status !== "OPEN") {
      return apiError("ROOM_CLOSED", 400, { message: "종료된 채팅방입니다." });
    }

    const isAdmin = user.role === "admin";
    const side = resolveChatParticipantSide(room, user.id, isAdmin);
    if (!side || side === "admin") {
      return apiError("FORBIDDEN", 403);
    }

    const senderRole =
      side === "owner" ? ChatSenderRole.owner : ChatSenderRole.advertiser;

    const text = parsed.data.body?.trim() ?? "";
    if (!text && !parsed.data.attachmentUrl) {
      return apiError("EMPTY", 400);
    }

    const result = await sendChatMessage(db, {
      roomId,
      senderUserId: user.id,
      senderRole,
      body: text,
      attachmentUrl: parsed.data.attachmentUrl,
      attachmentType: parsed.data.attachmentType,
      attachmentName: parsed.data.attachmentName,
    });

    return apiOk({
      messageId: result.messageId,
      contactBlocked: result.contactBlocked,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "EMPTY_MESSAGE") {
      return apiError("EMPTY", 400);
    }
    return apiServerError(e, "chat/rooms/[id]/messages POST");
  }
}
