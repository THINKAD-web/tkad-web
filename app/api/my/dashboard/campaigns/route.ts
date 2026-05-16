import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { fetchAdvertiserCampaigns } from "@/lib/advertiser-dashboard-queries";
import type { CampaignTab } from "@/lib/advertiser-campaign-metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    const tab = request.nextUrl.searchParams.get("tab") as CampaignTab | null;
    const valid =
      tab === "active" || tab === "completed" || tab === "upcoming"
        ? tab
        : undefined;
    const items = await fetchAdvertiserCampaigns(user.id, user.email, valid);
    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "my/dashboard/campaigns");
  }
}
