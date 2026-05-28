import { z } from "zod";
import { establishUserSession } from "@/lib/establish-user-session";
import { completeKakaoSignup } from "@/lib/kakao-auth";
import {
  appRoleFromSignupRole,
  clearKakaoPending,
  communityRoleFromSignupRole,
  readKakaoPending,
} from "@/lib/kakao-oauth-pending";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
  readJson,
} from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeSignupStartRole } from "@/lib/signup-start-roles";
import { seedSignupOnboardingPreference } from "@/lib/signup-start-roles-server";

export const runtime = "nodejs";

const Body = z.object({
  role: z.string().transform((value, ctx) => {
    const normalized = normalizeSignupStartRole(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid role" });
      return z.NEVER;
    }
    return normalized;
  }),
});

const limiter = rateLimit({ limit: 10, windowMs: 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`kakao-complete:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const pending = await readKakaoPending();
    if (!pending) {
      return apiError("KAKAO_PENDING_EXPIRED", 400, {
        message: "카카오 인증이 만료되었습니다. 다시 로그인해주세요.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const signupRole = parsed.data.role;
    const communityRole = communityRoleFromSignupRole(signupRole);
    const appRole = appRoleFromSignupRole(signupRole);

    const created = await completeKakaoSignup({
      providerAccountId: pending.providerAccountId,
      email: pending.email,
      name: pending.name,
      image: pending.image,
      accessToken: pending.accessToken,
      refreshToken: pending.refreshToken,
      expiresAt: pending.expiresAt,
      communityRole,
      appRole,
    });

    if (!created) {
      return apiError("EMAIL_IN_USE", 409, {
        message: "이미 가입된 이메일입니다. 이메일 로그인을 이용해주세요.",
      });
    }

    const sessionOk = await establishUserSession(
      created.userId,
      created.role,
      req,
    );
    if (!sessionOk) {
      return apiError("SESSION_SECRET_MISSING", 500, {
        message: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
      });
    }

    await clearKakaoPending();

    void seedSignupOnboardingPreference(created.userId, signupRole).catch(
      (err) => console.error("[auth/kakao/complete] onboarding preference", err),
    );

    return apiOk({
      id: created.userId,
      role: created.role,
      redirect: pending.redirect,
    });
  } catch (e) {
    return apiServerError(e, "auth/kakao/complete");
  }
}
