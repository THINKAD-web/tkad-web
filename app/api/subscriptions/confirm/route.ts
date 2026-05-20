import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { confirmProSubscription } from "@/lib/subscription-billing";

export const runtime = "nodejs";

const Body = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, { message: "로그인이 필요합니다." });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    await confirmProSubscription({
      userId: user.id,
      ...parsed.data,
    });

    return apiOk({ ok: true });
  } catch (e) {
    return apiServerError(e, "subscriptions/confirm");
  }
}
