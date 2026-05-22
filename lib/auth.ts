import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import type { KakaoProfile } from "@auth/core/providers/kakao";
import { establishUserSession } from "@/lib/establish-user-session";
import { resolveKakaoSignIn } from "@/lib/kakao-auth";
import {
  KAKAO_AUTH_LOCALE_COOKIE,
  KAKAO_AUTH_REDIRECT_COOKIE,
} from "@/lib/kakao-auth-redirect";
import NaverProvider from "@/lib/naver-provider";
import { resolveNaverSignIn } from "@/lib/naver-auth";
import {
  NAVER_AUTH_LOCALE_COOKIE,
  NAVER_AUTH_REDIRECT_COOKIE,
} from "@/lib/naver-auth-redirect";
import {
  checkNextAuthConfig,
  isKakaoOAuthConfigured,
  isNaverOAuthConfigured,
} from "@/lib/auth-oauth-env";

const nextAuthConfig = checkNextAuthConfig();
const authSecretValue = nextAuthConfig.ok ? nextAuthConfig.secret : undefined;

if (!nextAuthConfig.ok) {
  console.error(
    "[auth] NextAuth disabled until AUTH_SECRET or USER_SESSION_SECRET is set:",
    nextAuthConfig.issues.map((i) => i.key).join(", "),
  );
}

const providers = [
  ...(isKakaoOAuthConfigured()
    ? [
        Kakao({
          clientId: process.env.KAKAO_CLIENT_ID!,
          clientSecret: process.env.KAKAO_CLIENT_SECRET!,
        }),
      ]
    : []),
  ...(isNaverOAuthConfigured()
    ? [
        NaverProvider({
          clientId: process.env.NAVER_CLIENT_ID!,
          clientSecret: process.env.NAVER_CLIENT_SECRET!,
        }),
      ]
    : []),
];

export const { handlers, signIn, auth } = NextAuth({
  trustHost: true,
  secret: authSecretValue,
  providers,
  session: { strategy: "jwt", maxAge: 60 * 10 },
  callbacks: {
    async signIn({ account, profile }) {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();

      if (account?.provider === "kakao") {
        if (!isKakaoOAuthConfigured()) return false;
        if (!account.providerAccountId) return false;

        const redirect =
          cookieStore.get(KAKAO_AUTH_REDIRECT_COOKIE)?.value ?? "/my";
        const locale =
          cookieStore.get(KAKAO_AUTH_LOCALE_COOKIE)?.value ?? "ko";

        const result = await resolveKakaoSignIn({
          providerAccountId: account.providerAccountId,
          profile: profile as unknown as KakaoProfile,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? undefined,
          redirect,
        });

        if (result.type === "existing") {
          const ok = await establishUserSession(result.userId, result.role);
          if (!ok) return false;
          cookieStore.delete(KAKAO_AUTH_REDIRECT_COOKIE);
          cookieStore.delete(KAKAO_AUTH_LOCALE_COOKIE);
          return true;
        }

        if (result.type === "pending") {
          cookieStore.delete(KAKAO_AUTH_REDIRECT_COOKIE);
          cookieStore.delete(KAKAO_AUTH_LOCALE_COOKIE);
          const safeRedirect = redirect.startsWith("/") ? redirect : "/my";
          return `/${locale}/register/kakao?redirect=${encodeURIComponent(safeRedirect)}`;
        }

        return false;
      }

      if (account?.provider === "naver") {
        if (!isNaverOAuthConfigured()) return false;
        if (!account.providerAccountId) return false;

        const redirect =
          cookieStore.get(NAVER_AUTH_REDIRECT_COOKIE)?.value ?? "/my";
        const locale =
          cookieStore.get(NAVER_AUTH_LOCALE_COOKIE)?.value ?? "ko";

        const result = await resolveNaverSignIn({
          providerAccountId: account.providerAccountId,
          profile: profile as {
            id?: string;
            email?: string | null;
            name?: string | null;
            image?: string | null;
          },
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at ?? undefined,
          redirect,
        });

        if (result.type === "existing") {
          const ok = await establishUserSession(result.userId, result.role);
          if (!ok) return false;
          cookieStore.delete(NAVER_AUTH_REDIRECT_COOKIE);
          cookieStore.delete(NAVER_AUTH_LOCALE_COOKIE);
          return true;
        }

        if (result.type === "pending") {
          cookieStore.delete(NAVER_AUTH_REDIRECT_COOKIE);
          cookieStore.delete(NAVER_AUTH_LOCALE_COOKIE);
          const safeRedirect = redirect.startsWith("/") ? redirect : "/my";
          return `/${locale}/register/naver?redirect=${encodeURIComponent(safeRedirect)}`;
        }

        return false;
      }

      return false;
    },
    async redirect({ url, baseUrl }) {
      if (url.includes("/register/kakao")) return url;
      if (url.includes("/register/naver")) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        /* ignore */
      }
      return `${baseUrl}/ko/my`;
    },
  },
});
