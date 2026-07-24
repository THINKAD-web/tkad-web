import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import {
  createPaidCheckout,
  type CheckoutablePlan,
} from "@/lib/subscription-billing";
import { isTossPaymentsConfigured } from "@/lib/toss-payments";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["LITE", "PRO", "AGENCY"]).optional().default("PRO"),
});

export async function POST(req: Request) {
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

    const raw = await readJson(req);
    const parsed = Body.safeParse(raw ?? {});
    if (!parsed.success) return apiZodError(parsed.error);

    const plan = parsed.data.plan as CheckoutablePlan;
    const checkout = await createPaidCheckout(user.id, plan);
    return apiOk(checkout);
  } catch (e) {
    return apiServerError(e, "subscriptions/checkout");
  }
}
