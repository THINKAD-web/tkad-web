import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import type { KakaoProfile } from "@auth/core/providers/kakao";
import { establishUserSession } from "@/lib/establish-user-session";
import { resolveKakaoSignIn } from "@/lib/kakao-auth";
import {
  KAKAO_AUTH_LOCALE_COOKIE,
  KAKAO_AUTH_REDIRECT_COOKIE,
} from "@/lib/kakao-auth-redirect";

function authSecret(): string | undefined {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.USER_SESSION_SECRET?.trim() ||
    undefined
  );
}

function kakaoConfigured(): boolean {
  return Boolean(
    process.env.KAKAO_CLIENT_ID?.trim() &&
      process.env.KAKAO_CLIENT_SECRET?.trim(),
  );
}

export const { handlers, signIn, auth } = NextAuth({
  trustHost: true,
  secret: authSecret(),
  providers: kakaoConfigured()
    ? [
        Kakao({
          clientId: process.env.KAKAO_CLIENT_ID!,
          clientSecret: process.env.KAKAO_CLIENT_SECRET!,
        }),
      ]
    : [],
  session: { strategy: "jwt", maxAge: 60 * 10 },
  callbacks: {
    async signIn({ account, profile }) {
      if (!kakaoConfigured()) return false;
      if (account?.provider !== "kakao" || !account.providerAccountId) {
        return false;
      }

      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
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
    },
    async redirect({ url, baseUrl }) {
      if (url.includes("/register/kakao")) return url;
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
