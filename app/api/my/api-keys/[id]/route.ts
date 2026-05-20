import { apiError, apiOk } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
  }
  if (!isDatabaseConfigured()) {
    return apiError("SERVICE_UNAVAILABLE", 503);
  }

  const { id } = await params;
  const db = getPrisma();

  const existing = await db.apiKey.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return apiError("NOT_FOUND", 404);
  }

  await db.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  return apiOk({ revoked: true });
}
