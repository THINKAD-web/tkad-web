import { z } from "zod";
import type { AppUserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { issueEmailVerification } from "@/lib/email-verification";
import { rateLimit } from "@/lib/rate-limit";
import {
  USER_SESSION_COOKIE,
  createSessionRecord,
  createUserSessionToken,
  userSessionCookieOptions,
} from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  getClientIp,
  readJson,
} from "@/lib/api-response";

export const runtime = "nodejs";

const COMMUNITY_SIGNUP_ROLES = [
  "ADVERTISER",
  "MEDIA",
  "AGENCY",
  "FREELANCER",
] as const;

function appRoleForCommunityRole(cr: (typeof COMMUNITY_SIGNUP_ROLES)[number]): AppUserRole {
  if (cr === "MEDIA") return "owner";
  if (cr === "AGENCY") return "agency";
  return "advertiser";
}

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(40),
  phone: z.string().max(20).optional(),
  company: z.string().max(80).optional(),
  locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
  communityRole: z.enum(COMMUNITY_SIGNUP_ROLES).default("ADVERTISER"),
});

const limiter = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!limiter.check(`register:${ip}`)) {
      return apiError("RATE_LIMITED", 429, {
        message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { email, password, name, phone, company, locale, communityRole } =
      parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("EMAIL_IN_USE", 409, {
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    const passwordHash = await hashPassword(password);
    const appRole = appRoleForCommunityRole(communityRole);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone,
        company,
        locale,
        role: appRole,
        communityRole,
        lastLoginAt: new Date(),
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = createUserSessionToken(user.id, user.role);
    if (!token) {
      return apiError("SESSION_SECRET_MISSING", 500, {
        message: "서버 설정 오류입니다. 관리자에게 문의해주세요.",
      });
    }

    await createSessionRecord({
      userId: user.id,
      token,
      userAgent: req.headers.get("user-agent") ?? undefined,
      ip,
    });

    void issueEmailVerification(user.id, locale).catch((err) => {
      console.error("[auth/register] verification email failed:", err);
    });

    const { startProTrialIfEligible } = await import("@/lib/report-access");
    void startProTrialIfEligible(user.id).catch(console.error);

    const res = apiOk(user, { status: 201 });
    res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
    return res;
  } catch (e) {
    return apiServerError(e, "auth/register");
  }
}
