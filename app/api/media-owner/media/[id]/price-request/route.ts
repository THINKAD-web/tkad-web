import { z } from "zod";
import { apiError, apiOk, apiZodError } from "@/lib/api-response";
import {
  assertOwnsMedia,
  requireMediaOwner,
} from "@/lib/media-owner-guard";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  requestedPrice: z.number().int().positive().max(10_000_000_000),
  reason: z.string().max(2000).optional().nullable(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;
  const { id: mediaId } = await params;
  if (!(await assertOwnsMedia(auth.user.id, mediaId))) {
    return apiError("NOT_FOUND", 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("INVALID_INPUT", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return apiZodError(parsed.error);

  const db = getPrisma();
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { price: true },
  });
  if (!media) return apiError("NOT_FOUND", 404);

  const pending = await db.mediaPriceChangeRequest.count({
    where: { mediaId, status: "PENDING" },
  });
  if (pending > 0) {
    return apiError("CONFLICT", 409, {
      message: "이미 검토 중인 단가 수정 요청이 있습니다.",
    });
  }

  const row = await db.mediaPriceChangeRequest.create({
    data: {
      mediaId,
      ownerUserId: auth.user.id,
      currentPrice: media.price,
      requestedPrice: parsed.data.requestedPrice,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  return apiOk({ request: row }, { status: 201 });
}
