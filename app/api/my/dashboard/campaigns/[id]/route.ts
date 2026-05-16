import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { fetchAdvertiserCampaignDetail } from "@/lib/advertiser-dashboard-queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    const { id } = await params;
    const detail = await fetchAdvertiserCampaignDetail(
      user.id,
      user.email,
      id,
    );
    if (!detail) {
      return apiError("NOT_FOUND", 404, { message: "캠페인을 찾을 수 없습니다." });
    }
    return apiOk(detail);
  } catch (e) {
    return apiServerError(e, "my/dashboard/campaigns/[id]");
  }
}
