import { NextRequest } from "next/server";
import { listCampaignPlansForOwner } from "@/lib/campaign-plan-store";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/user-session";

export const dynamic = "force-dynamic";

/** 로그인 사용자의 CampaignPlan(브리프 위저드 저장) 목록 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
  }

  const locale = request.nextUrl.searchParams.get("locale");
  const isKo = locale !== "en";

  try {
    const items = await listCampaignPlansForOwner({
      ownerId: user.id,
      isKo,
    });
    return apiOk({ items });
  } catch (err) {
    return apiServerError(err, "my/plan/campaigns");
  }
}
