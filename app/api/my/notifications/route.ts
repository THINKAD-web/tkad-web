import { getCurrentUser } from "@/lib/user-session";
import { listNotificationsForUser } from "@/lib/notifications";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Math.min(100, Math.max(1, Number(limitRaw))) : 50;

    const { items, unreadCount } = await listNotificationsForUser(user.id, {
      unreadOnly,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    return apiOk({ items, unreadCount });
  } catch (e) {
    return apiServerError(e, "my/notifications GET");
  }
}
