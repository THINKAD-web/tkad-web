import { apiError, apiOk } from "@/lib/api-response";
import {
  requireMediaOwner,
  getOwnedMediaIds,
} from "@/lib/media-owner-guard";
import { parseActualMetric } from "@/lib/campaign-actuals";
import { getPrisma } from "@/lib/prisma";
import { postInternalAlert } from "@/lib/internal-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** 매체사 — 자신의 매체가 포함된 캠페인의 실측 실적(노출·도달) 수기 입력. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireMediaOwner();
  if (!auth.ok) return auth.response;

  const { id: campaignId } = await params;
  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("INVALID_INPUT", 400);
  }

  const impressions = parseActualMetric(raw.actualImpressions);
  const reach = parseActualMetric(raw.actualReach);
  const cleared = impressions == null && reach == null;

  const db = getPrisma();
  const mediaIds = await getOwnedMediaIds(auth.user.id);
  const linked = await db.mediaBooking.findFirst({
    where: { campaignId, mediaId: { in: mediaIds } },
    select: { id: true },
  });
  if (!linked) return apiError("FORBIDDEN", 403);

  try {
    const campaign = await db.campaign.update({
      where: { id: campaignId },
      data: {
        actualImpressions: impressions,
        actualReach: reach,
        actualEnteredAt: cleared ? null : new Date(),
        actualSource: cleared ? null : "media_owner",
        actualEnteredById: cleared ? null : auth.user.id,
      },
      select: {
        id: true,
        actualImpressions: true,
        actualReach: true,
        actualEnteredAt: true,
      },
    });
    void postInternalAlert({
      type: "media_owner_actuals",
      title: "매체사 실적 입력",
      body: `${auth.user.name} · 캠페인 ${campaignId.slice(0, 8)}…`,
      meta: { campaignId, userId: auth.user.id, impressions, reach },
    }).catch(() => {});
    return apiOk({ campaign });
  } catch {
    return apiError("NOT_FOUND", 404);
  }
}
