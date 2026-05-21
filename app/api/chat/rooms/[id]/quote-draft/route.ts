import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { createOoHQuoteFromChatRoom } from "@/lib/chat-quote-flow";
import { resolveChatParticipantSide } from "@/lib/chat-room-service";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);
    if (!isDatabaseConfigured()) return apiError("DB_UNAVAILABLE", 503);

    const { id: roomId } = await params;
    const db = getPrisma();
    const room = await db.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, ownerUserId: true, advertiserUserId: true, locale: true },
    });
    if (!room) return apiError("NOT_FOUND", 404);

    const side = resolveChatParticipantSide(room, user.id, user.role === "admin");
    if (side !== "owner") {
      return apiError("FORBIDDEN", 403, {
        message: "매체사 운영자만 견적서를 생성할 수 있습니다.",
      });
    }

    const { quoteId } = await createOoHQuoteFromChatRoom(db, roomId);
    const locale = room.locale === "en" ? "en" : "ko";
    return apiOk({
      quoteId,
      previewUrl: `/${locale}/quote/${quoteId}/preview`,
    });
  } catch (e) {
    return apiServerError(e, "chat/rooms/[id]/quote-draft");
  }
}
