import { prisma } from "@/lib/prisma";
import type {
  OAuthNormalizedProfile,
  OAuthProviderId,
} from "@/lib/oauth/providers";

/**
 * provider profile → 내부 User 행 찾기/생성/링크.
 *
 * 우선순위:
 *   1) (provider, providerAccountId) 가 이미 링크돼 있으면 그 User 반환
 *   2) 같은 이메일의 User 가 있으면 OAuthAccount 만 신규 링크
 *   3) 둘 다 없으면 신규 User 생성 (role=advertiser 기본) + OAuthAccount 링크
 *
 * 반환된 `created` 는 새 User 가 만들어졌는지(=신규 가입 여부).
 */
export async function resolveOrCreateUserForOAuth(args: {
  provider: OAuthProviderId;
  profile: OAuthNormalizedProfile;
  locale: string;
}): Promise<{ userId: string; created: boolean; emailNeeded: boolean }> {
  const { provider, profile, locale } = args;

  const existingLink = await prisma.userOAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    select: { userId: true },
  });

  if (existingLink) {
    // 프로필 정보 동기화(이메일/이름은 갱신만, 덮어쓰지 않음)
    await prisma.userOAuthAccount.update({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: profile.providerAccountId,
        },
      },
      data: {
        providerEmail: profile.email ?? undefined,
        providerName: profile.name ?? undefined,
      },
    });
    return {
      userId: existingLink.userId,
      created: false,
      emailNeeded: false,
    };
  }

  // 이메일로 기존 User 매칭 (이미 비번 가입한 사용자가 이후 카카오를 연결하는 경로)
  if (profile.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      select: { id: true, deletedAt: true },
    });
    if (existingUser && !existingUser.deletedAt) {
      await prisma.userOAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerAccountId: profile.providerAccountId,
          providerEmail: profile.email,
          providerName: profile.name ?? undefined,
        },
      });
      return {
        userId: existingUser.id,
        created: false,
        emailNeeded: false,
      };
    }
  }

  // 신규 가입.
  // 이메일 미제공 시 provider id 기반 placeholder 이메일을 임시로 부여하고
  // 첫 로그인 후 프로필 페이지에서 진짜 이메일 입력하도록 유도(emailNeeded=true).
  const fallbackEmail = profile.email
    ? profile.email
    : `${provider}_${profile.providerAccountId}@oauth.local.thinkad`;
  const emailNeeded = !profile.email;
  const name = profile.name?.slice(0, 40) || (provider === "kakao" ? "카카오 사용자" : "네이버 사용자");

  const created = await prisma.user.create({
    data: {
      email: fallbackEmail,
      passwordHash: null,
      name,
      phone: profile.phone ? profile.phone.slice(0, 20) : null,
      locale,
      role: "advertiser",
      lastLoginAt: new Date(),
      emailVerifiedAt: profile.email ? new Date() : null,
      oauthAccounts: {
        create: {
          provider,
          providerAccountId: profile.providerAccountId,
          providerEmail: profile.email ?? undefined,
          providerName: profile.name ?? undefined,
        },
      },
    },
    select: { id: true },
  });

  return { userId: created.id, created: true, emailNeeded };
}
