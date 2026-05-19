import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    return apiOk({ updated: result.count });
  } catch (e) {
    return apiServerError(e, "my/notifications/read-all");
  }
}
