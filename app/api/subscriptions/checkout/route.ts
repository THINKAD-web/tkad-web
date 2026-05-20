import { getCurrentUser } from "@/lib/user-session";
import { apiError, apiOk, apiServerError, readJson } from "@/lib/api-response";
import { createProCheckout } from "@/lib/subscription-billing";
import { isTossPaymentsConfigured } from "@/lib/toss-payments";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }
    if (!isTossPaymentsConfigured()) {
      return apiError("PAYMENTS_NOT_CONFIGURED", 503, {
        message: "결제 설정이 완료되지 않았습니다.",
      });
    }

    const checkout = await createProCheckout(user.id);
    return apiOk(checkout);
  } catch (e) {
    return apiServerError(e, "subscriptions/checkout");
  }
}
