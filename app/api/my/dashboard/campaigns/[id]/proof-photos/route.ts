import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { campaignAccessWhere } from "@/lib/advertiser-campaign-access";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    const { id } = await params;
    const db = getPrisma();
    const campaign = await db.campaign.findFirst({
      where: { id, ...campaignAccessWhere(user.id, user.email) },
      select: { id: true },
    });
    if (!campaign) {
      return apiError("NOT_FOUND", 404, { message: "캠페인을 찾을 수 없습니다." });
    }

    const photos = await db.campaignProofPhoto.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      take: 48,
      select: {
        id: true,
        imageUrl: true,
        imageUrlWatermarked: true,
        caption: true,
        createdAt: true,
      },
    });

    return apiOk({
      photos: photos.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrlWatermarked ?? p.imageUrl,
        caption: p.caption,
        createdAt: p.createdAt.toISOString(),
      })),
      latestProofAt: photos[0]?.createdAt.toISOString() ?? null,
    });
  } catch (e) {
    return apiServerError(e, "my/dashboard/campaigns/[id]/proof-photos");
  }
}
