import type { KakaoProfile } from "@auth/core/providers/kakao";
import type { AppUserRole, CommunityMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setKakaoPending } from "@/lib/kakao-oauth-pending";

export type KakaoSignInInput = {
  providerAccountId: string;
  profile: KakaoProfile;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  redirect: string;
};

export type KakaoSignInResult =
  | { type: "existing"; userId: string; role: AppUserRole }
  | { type: "pending" }
  | { type: "error"; code: "INVALID_PROFILE" | "PENDING_COOKIE_FAILED" };

function kakaoEmail(profile: KakaoProfile, providerAccountId: string): string {
  const email = profile.kakao_account?.email?.trim();
  if (email) return email.toLowerCase();
  return `kakao_${providerAccountId}@oauth.tkad.local`;
}

function kakaoDisplayName(profile: KakaoProfile): string {
  return (
    profile.kakao_account?.profile?.nickname?.trim() ||
    profile.kakao_account?.name?.trim() ||
    profile.properties?.nickname?.trim() ||
    "카카오 사용자"
  );
}

function kakaoImage(profile: KakaoProfile): string | undefined {
  return (
    profile.kakao_account?.profile?.profile_image_url ||
    profile.properties?.profile_image ||
    undefined
  );
}

function sanitizeRedirect(redirect: string): string {
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/my";
  return redirect;
}

export async function resolveKakaoSignIn(
  input: KakaoSignInInput,
): Promise<KakaoSignInResult> {
  const { providerAccountId, profile } = input;
  if (!providerAccountId) {
    return { type: "error", code: "INVALID_PROFILE" };
  }

  const redirect = sanitizeRedirect(input.redirect);
  const email = kakaoEmail(profile, providerAccountId);
  const name = kakaoDisplayName(profile);
  const image = kakaoImage(profile);

  const linked = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "kakao",
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
          provider: "kakao",
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
          provider: "kakao",
          providerAccountId,
        },
      },
      create: {
        userId: byEmail.id,
        type: "oauth",
        provider: "kakao",
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

  const ok = await setKakaoPending({
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

export async function completeKakaoSignup(params: {
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
        provider: "kakao",
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
          provider: "kakao",
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
