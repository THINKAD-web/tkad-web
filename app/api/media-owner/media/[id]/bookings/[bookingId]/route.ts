import { apiError, apiOk } from "@/lib/api-response";
import {
  assertOwnsMedia,
  requireMediaOwner,
} from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; bookingId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const { id: mediaId, bookingId } = await params;
  if (!(await assertOwnsMedia(auth.user.id, mediaId))) {
    return apiError("NOT_FOUND", 404);
  }

  const db = getPrisma();
  const row = await db.mediaBooking.findFirst({
    where: { id: bookingId, mediaId, isOwnerBlock: true },
  });
  if (!row) {
    return apiError("NOT_FOUND", 404, {
      message: "매체사 블록만 삭제할 수 있습니다.",
    });
  }

  await db.mediaBooking.delete({ where: { id: bookingId } });
  return apiOk({ deleted: true });
}
