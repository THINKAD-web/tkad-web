import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { redeemPoints, type RedeemType } from "@/lib/points";

export const runtime = "nodejs";

const Body = z.object({
  type: z.enum(["PRO_DAY", "PRO_WEEK", "PRO_MONTH", "PDF_REPORT", "MEDIA_DETAIL"]),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);
    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const result = await redeemPoints(user.id, parsed.data.type as RedeemType);
    if (!result.ok) {
      return apiError("INSUFFICIENT_POINTS", 400, {
        message: result.error,
      });
    }

    return apiOk(result);
  } catch (e) {
    return apiServerError(e, "points/redeem");
  }
}
