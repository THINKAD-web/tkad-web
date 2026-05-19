import { z } from "zod";
import { verifyEmailByToken } from "@/lib/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
} from "@/lib/api-response";

export const runtime = "nodejs";

const Query = z.object({
  token: z.string().min(16).max(256),
});

const limiter = rateLimit({ limit: 20, windowMs: 60 * 1000 });

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`verify-email:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const url = new URL(req.url);
    const parsed = Query.safeParse({ token: url.searchParams.get("token") ?? "" });
    if (!parsed.success) return apiZodError(parsed.error);

    const result = await verifyEmailByToken(parsed.data.token);
    if (!result.ok) {
      const code =
        result.reason === "ALREADY_VERIFIED"
          ? "ALREADY_VERIFIED"
          : "INVALID_OR_EXPIRED";
      return apiError(code, 400, {
        message:
          result.reason === "ALREADY_VERIFIED"
            ? "이미 인증된 계정입니다."
            : "인증 링크가 유효하지 않거나 만료되었습니다.",
      });
    }

    return apiOk({ verified: true });
  } catch (e) {
    return apiServerError(e, "auth/verify-email");
  }
}
