import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { acceptChatRoomQuote } from "@/lib/chat-quote-flow";
import { isBookingHoldConflictError } from "@/lib/ooh-quote-booking-hold";
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
    const result = await acceptChatRoomQuote(db, roomId, user.id);
    if (!result) {
      return apiError("NO_QUOTE", 400, {
        message: "수락할 견적서가 없습니다.",
      });
    }
    return apiOk(result);
  } catch (e) {
    if (isBookingHoldConflictError(e)) {
      return apiError("BOOKING_CONFLICT", 409, {
        message: e.message,
        conflicts: e.conflicts,
      });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NOT_CHAT_QUOTE") {
      return apiError("INVALID_QUOTE", 400);
    }
    return apiServerError(e, "chat/rooms/[id]/accept-quote");
  }
}
