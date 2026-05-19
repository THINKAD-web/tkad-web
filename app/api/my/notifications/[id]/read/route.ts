import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const { id } = await params;
    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return apiError("NOT_FOUND", 404, { message: "알림을 찾을 수 없습니다." });
    }

    const row = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return apiOk({
      id: row.id,
      isRead: row.isRead,
    });
  } catch (e) {
    return apiServerError(e, "my/notifications/[id]/read");
  }
}
