import { signUploadParams } from "@/lib/cloudinary-sign";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
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
      select: { id: true, advertiserUserId: true, ownerUserId: true, status: true },
    });
    if (!room) return apiError("NOT_FOUND", 404);
    if (room.status !== "OPEN") {
      return apiError("ROOM_CLOSED", 400);
    }

    const side = resolveChatParticipantSide(room, user.id, user.role === "admin");
    if (!side || side === "admin") return apiError("FORBIDDEN", 403);

    const folder = `tkad/chat/${roomId}`;
    const signed = signUploadParams(folder);
    if (!signed) {
      return apiError("UPLOAD_DISABLED", 503, {
        message: "파일 업로드가 비활성화되어 있습니다.",
      });
    }
    return apiOk(signed);
  } catch (e) {
    return apiServerError(e, "chat/rooms/[id]/upload-sign");
  }
}
