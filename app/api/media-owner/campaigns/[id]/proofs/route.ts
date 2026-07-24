import { z } from "zod";
import { apiError, apiOk, apiZodError } from "@/lib/api-response";
import {
  assertOwnsMedia,
  requireMediaOwner,
  getOwnedMediaIds,
} from "@/lib/media-owner-guard";
import { createCampaignProofPhoto } from "@/lib/campaign-proof-service";
import { postInternalAlert } from "@/lib/internal-webhook";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().max(500).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export async function POST(request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("INVALID_INPUT", 400);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return apiZodError(parsed.error);

  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(auth.user.id);
  const linked = await db.mediaBooking.findFirst({
    where: {
      campaignId,
      mediaId: { in: mediaIds },
    },
    select: { mediaId: true },
  });
  if (!linked || !(await assertOwnsMedia(auth.user.id, linked.mediaId))) {
    return apiError("FORBIDDEN", 403);
  }

  try {
    const photo = await createCampaignProofPhoto({
      campaignId,
      imageUrl: parsed.data.imageUrl,
      caption:
        parsed.data.caption?.trim() ||
        `[매체사] ${auth.user.name}`,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      uploadSource: "media_owner",
      uploadedByUserId: auth.user.id,
    });
    void postInternalAlert({
      type: "media_owner_proof",
      title: "매체사 인증 사진 업로드",
      body: `${auth.user.name} · 캠페인 ${campaignId.slice(0, 8)}…`,
      meta: { campaignId, photoId: photo.id, userId: auth.user.id },
    }).catch(() => {});
    return apiOk({ photo }, { status: 201 });
  } catch {
    return apiError("NOT_FOUND", 404);
  }
}
