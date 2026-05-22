import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { getReferralStats } from "@/lib/points";
import { siteUrl } from "@/lib/seo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const stats = await getReferralStats(user.id);
    const inviteLink = `${siteUrl.replace(/\/$/, "")}/ko/join?ref=${user.id}`;

    return apiOk({ ...stats, inviteLink, userId: user.id });
  } catch (e) {
    return apiServerError(e, "my/referral");
  }
}
