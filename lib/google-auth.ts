import type { AppUserRole, CommunityMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setGooglePending } from "@/lib/google-oauth-pending";
import { buildTrialGrantData } from "@/lib/check-plan";

export type GoogleOAuthProfile = {
  sub?: string;
  email?: string | null;
  email_verified?: boolean;
  name?: string | null;
  picture?: string | null;
  given_name?: string | null;
  family_name?: string | null;
};

export type GoogleSignInInput = {
  providerAccountId: string;
  profile: GoogleOAuthProfile;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  redirect: string;
};

export type GoogleSignInResult =
  | { type: "existing"; userId: string; role: AppUserRole }
  | { type: "pending" }
  | { type: "error"; code: "INVALID_PROFILE" | "PENDING_COOKIE_FAILED" };

function normalizeGoogleIdentity(
  profile: GoogleOAuthProfile,
  providerAccountId: string,
): { email: string; name: string; image?: string } {
  const email = profile.email?.trim();
  const name =
    profile.name?.trim() ||
    [profile.given_name, profile.family_name].filter(Boolean).join(" ").trim() ||
    "Google 사용자";

  return {
    email: email
      ? email.toLowerCase()
      : `google_${providerAccountId}@oauth.tkad.local`,
    name,
    image: profile.picture ?? undefined,
  };
}

function sanitizeRedirect(redirect: string): string {
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/my";
  return redirect;
}

export async function resolveGoogleSignIn(
  input: GoogleSignInInput,
): Promise<GoogleSignInResult> {
  const { providerAccountId, profile } = input;
  if (!providerAccountId) {
    return { type: "error", code: "INVALID_PROFILE" };
  }

  const { email, name, image } = normalizeGoogleIdentity(profile, providerAccountId);
  const redirect = sanitizeRedirect(input.redirect);

  const linked = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "google",
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
          provider: "google",
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
          provider: "google",
          providerAccountId,
        },
      },
      create: {
        userId: byEmail.id,
        type: "oauth",
        provider: "google",
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

  const ok = await setGooglePending({
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

export async function completeGoogleSignup(params: {
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
        provider: "google",
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
      ...buildTrialGrantData(),
      accounts: {
        create: {
          type: "oauth",
          provider: "google",
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
