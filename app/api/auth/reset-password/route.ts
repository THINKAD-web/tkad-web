import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(128),
});

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`reset-password:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const result = await resetPasswordWithToken(
      parsed.data.token,
      parsed.data.password,
    );

    if (!result.ok) {
      return apiError("INVALID_OR_EXPIRED", 400, {
        message: "재설정 링크가 유효하지 않거나 만료되었습니다.",
      });
    }

    return apiOk({ reset: true });
  } catch (e) {
    return apiServerError(e, "auth/reset-password");
  }
}
