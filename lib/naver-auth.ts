import type { AppUserRole, CommunityMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setNaverPending } from "@/lib/naver-oauth-pending";
import type { NaverProfile } from "@/lib/naver-provider";

/** NextAuth `profile()` 매핑 후 또는 네이버 userinfo 원본 */
export type NaverOAuthProfile = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export type NaverSignInInput = {
  providerAccountId: string;
  profile: NaverProfile | NaverOAuthProfile;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  redirect: string;
};

export type NaverSignInResult =
  | { type: "existing"; userId: string; role: AppUserRole }
  | { type: "pending" }
  | { type: "error"; code: "INVALID_PROFILE" | "PENDING_COOKIE_FAILED" };

function isRawNaverProfile(
  profile: NaverProfile | NaverOAuthProfile,
): profile is NaverProfile {
  return (
    typeof profile === "object" &&
    profile != null &&
    "resultcode" in profile &&
    "response" in profile
  );
}

function normalizeNaverIdentity(
  profile: NaverProfile | NaverOAuthProfile,
  providerAccountId: string,
): { email: string; name: string; image?: string } {
  if (isRawNaverProfile(profile)) {
    if (profile.resultcode !== "00" || !profile.response?.id) {
      throw new Error("INVALID_PROFILE");
    }
    const email = profile.response.email?.trim();
    return {
      email: email
        ? email.toLowerCase()
        : `naver_${providerAccountId}@oauth.tkad.local`,
      name:
        profile.response.name?.trim() ||
        profile.response.nickname?.trim() ||
        "네이버 사용자",
      image: profile.response.profile_image || undefined,
    };
  }

  const email = profile.email?.trim();
  return {
    email: email
      ? email.toLowerCase()
      : `naver_${providerAccountId}@oauth.tkad.local`,
    name: profile.name?.trim() || "네이버 사용자",
    image: profile.image ?? undefined,
  };
}

function sanitizeRedirect(redirect: string): string {
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/my";
  return redirect;
}

export async function resolveNaverSignIn(
  input: NaverSignInInput,
): Promise<NaverSignInResult> {
  const { providerAccountId, profile } = input;
  if (!providerAccountId) {
    return { type: "error", code: "INVALID_PROFILE" };
  }

  let email: string;
  let name: string;
  let image: string | undefined;
  try {
    ({ email, name, image } = normalizeNaverIdentity(profile, providerAccountId));
  } catch {
    return { type: "error", code: "INVALID_PROFILE" };
  }

  const redirect = sanitizeRedirect(input.redirect);

  const linked = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "naver",
        providerAccountId,
      },
    },
    select: {
      user: {
        select: { id: true, role: true, deletedAt: true },
      },
    },
  });

  if (linked?.user && !linked.user.deletedAt) {
    await prisma.account.update({
      where: {
        provider_providerAccountId: {
          provider: "naver",
          providerAccountId,
        },
      },
      data: {
        accessToken: input.accessToken ?? undefined,
        refreshToken: input.refreshToken ?? undefined,
        expiresAt: input.expiresAt ?? undefined,
      },
    });
    return {
      type: "existing",
      userId: linked.user.id,
      role: linked.user.role,
    };
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, deletedAt: true },
  });

  if (byEmail && !byEmail.deletedAt) {
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "naver",
          providerAccountId,
        },
      },
      create: {
        userId: byEmail.id,
        type: "oauth",
        provider: "naver",
        providerAccountId,
        accessToken: input.accessToken ?? undefined,
        refreshToken: input.refreshToken ?? undefined,
        expiresAt: input.expiresAt ?? undefined,
      },
      update: {
        accessToken: input.accessToken ?? undefined,
        refreshToken: input.refreshToken ?? undefined,
        expiresAt: input.expiresAt ?? undefined,
      },
    });
    return {
      type: "existing",
      userId: byEmail.id,
      role: byEmail.role,
    };
  }

  const ok = await setNaverPending({
    providerAccountId,
    email,
    name,
    image,
    accessToken: input.accessToken ?? undefined,
    refreshToken: input.refreshToken ?? undefined,
    expiresAt: input.expiresAt ?? undefined,
    redirect,
  });

  if (!ok) {
    return { type: "error", code: "PENDING_COOKIE_FAILED" };
  }

  return { type: "pending" };
}

export async function completeNaverSignup(params: {
  providerAccountId: string;
  email: string;
  name: string;
  image?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  communityRole: CommunityMemberRole;
  appRole: AppUserRole;
}): Promise<{ userId: string; role: AppUserRole } | null> {
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "naver",
        providerAccountId: params.providerAccountId,
      },
    },
    select: { user: { select: { id: true, role: true, deletedAt: true } } },
  });
  if (existingAccount?.user && !existingAccount.user.deletedAt) {
    return {
      userId: existingAccount.user.id,
      role: existingAccount.user.role,
    };
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email: params.email },
    select: { id: true, deletedAt: true },
  });
  if (emailTaken && !emailTaken.deletedAt) {
    return null;
  }

  const user = await prisma.user.create({
    data: {
      email: params.email,
      name: params.name,
      role: params.appRole,
      communityRole: params.communityRole,
      emailVerifiedAt: params.email.includes("@oauth.tkad.local")
        ? null
        : new Date(),
      accounts: {
        create: {
          type: "oauth",
          provider: "naver",
          providerAccountId: params.providerAccountId,
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
          expiresAt: params.expiresAt,
        },
      },
    },
    select: { id: true, role: true },
  });

  return { userId: user.id, role: user.role };
}
