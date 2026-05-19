import { z } from "zod";
import { getCurrentUser } from "@/lib/user-session";
import { issueEmailVerification } from "@/lib/email-verification";
import { userNeedsEmailVerification } from "@/lib/user-email";
import { prisma } from "@/lib/prisma";
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
  locale: z.enum(["ko", "en", "zh", "ja"]).optional(),
});

const limiter = rateLimit({ limit: 3, windowMs: 60 * 60 * 1000 });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);

    const ip = getClientIp(req);
    if (!limiter.check(`verify-resend:${user.id}:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "인증 메일은 1시간에 3회까지 재발송할 수 있습니다.",
      });
    }

    const body = await readJson(req);
    const parsed = Body.safeParse(body ?? {});
    if (!parsed.success) return apiZodError(parsed.error);

    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        emailVerifiedAt: true,
        passwordHash: true,
        locale: true,
      },
    });
    if (!row) return apiError("NOT_FOUND", 404);

    if (
      !userNeedsEmailVerification({
        email: row.email,
        emailVerifiedAt: row.emailVerifiedAt,
        passwordHash: row.passwordHash,
      })
    ) {
      return apiError("ALREADY_VERIFIED", 400, {
        message: "이미 인증된 계정이거나 인증이 필요하지 않습니다.",
      });
    }

    if (!isEmailConfigured()) {
      return apiError("EMAIL_NOT_CONFIGURED", 503, {
        message: "이메일 발송이 설정되지 않았습니다. 관리자에게 문의해주세요.",
      });
    }

    const locale = parsed.data.locale ?? row.locale ?? "ko";
    const { sent } = await issueEmailVerification(user.id, locale);

    return apiOk({ sent });
  } catch (e) {
    return apiServerError(e, "auth/verify-email/resend");
  }
}
