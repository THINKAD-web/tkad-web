import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import { fetchAdvertiserInquiries } from "@/lib/advertiser-dashboard-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    const items = await fetchAdvertiserInquiries(user.email);
    return apiOk({ items });
  } catch (e) {
    return apiServerError(e, "my/dashboard/inquiries");
  }
}
