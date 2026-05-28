import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { issueEmailVerification } from "@/lib/email-verification";
import { enforceRateLimit } from "@/lib/rate-limit";
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
import { touchVisitorJourney } from "@/lib/visitor-journey";
import { ensureMediaOwnerProfile } from "@/lib/media-owner-incentives";
import { buildTrialGrantData } from "@/lib/check-plan";
import { awardPoints, processReferralSignup } from "@/lib/points";
import { ONBOARDING_ROLES } from "@/lib/onboarding-types";
import {
  resolveSignupStartRole,
} from "@/lib/signup-start-roles";
import { seedSignupOnboardingPreference } from "@/lib/signup-start-roles-server";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(40),
  phone: z.string().max(20).optional(),
  company: z.string().max(80).optional(),
  locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
  startRole: z.enum(ONBOARDING_ROLES).default("ADVERTISER"),
  sessionId: z.string().min(8).max(64).optional(),
  referralCode: z.string().max(16).optional(),
  /** 친구 초대 userId (?ref=) */
  inviteRefUserId: z.string().min(8).max(64).optional(),
});


export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = await enforceRateLimit("authRegister", ip);
    if (!rl.ok) {
      return apiError("RATE_LIMITED", rl.status, { message: rl.message });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const {
      email,
      password,
      name,
      phone,
      company,
      locale,
      startRole,
      sessionId,
      referralCode,
      inviteRefUserId,
    } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("EMAIL_IN_USE", 409, {
        message: "이미 사용 중인 이메일입니다.",
      });
    }

    const { communityRole, appRole, onboardingRole } =
      resolveSignupStartRole(startRole);
    const passwordHash = await hashPassword(password);
    const trial = buildTrialGrantData();
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
        ...trial,
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

    if (sessionId) {
      void touchVisitorJourney({
        sessionId,
        step: "signup",
        userId: user.id,
        mark: "signed_up",
        metadata: { email: user.email },
      });
    }

    void seedSignupOnboardingPreference(user.id, onboardingRole).catch((err) =>
      console.error("[auth/register] onboarding preference", err),
    );

    if (communityRole === "MEDIA" || user.role === "owner") {
      void ensureMediaOwnerProfile(user.id, referralCode).catch((err) =>
        console.error("[auth/register] media owner profile", err),
      );
    }

    void issueEmailVerification(user.id, locale).catch((err) => {
      console.error("[auth/register] verification email failed:", err);
    });

    if (user.role === "advertiser" || user.role === "agency") {
      void prisma.userWelcomeDrip
        .create({ data: { userId: user.id } })
        .catch(() => {});
    }

    void awardPoints(user.id, "SIGNUP", `signup-${user.id}`).catch((err) =>
      console.error("[auth/register] signup points", err),
    );

    if (inviteRefUserId && inviteRefUserId !== user.id) {
      void processReferralSignup(user.id, inviteRefUserId).catch((err) =>
        console.error("[auth/register] referral points", err),
      );
    }

    const res = apiOk(user, { status: 201 });
    res.cookies.set(USER_SESSION_COOKIE, token, userSessionCookieOptions());
    return res;
  } catch (e) {
    return apiServerError(e, "auth/register");
  }
}
