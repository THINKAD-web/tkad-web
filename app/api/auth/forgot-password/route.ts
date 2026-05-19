import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { isEmailConfigured } from "@/lib/email/client";
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
  email: z.string().email().max(254),
  locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
});

const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`forgot-password:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    if (!isEmailConfigured()) {
      return apiError("EMAIL_NOT_CONFIGURED", 503, {
        message: "이메일 발송이 설정되지 않았습니다. 관리자에게 문의해주세요.",
      });
    }

    await requestPasswordReset(parsed.data.email, parsed.data.locale);

    return apiOk({
      message:
        "등록된 이메일이 있다면 비밀번호 재설정 링크를 보냈습니다. 받은편지함을 확인해 주세요.",
    });
  } catch (e) {
    return apiServerError(e, "auth/forgot-password");
  }
}
