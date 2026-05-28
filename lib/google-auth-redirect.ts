export const GOOGLE_AUTH_REDIRECT_COOKIE = "tkad_google_auth_redirect";
export const GOOGLE_AUTH_LOCALE_COOKIE = "tkad_google_auth_locale";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
} as const;

export function sanitizeAuthRedirect(redirect: string | null): string {
  if (!redirect?.startsWith("/") || redirect.startsWith("//")) return "/my";
  return redirect;
}

export function applyGoogleAuthCookies(
  res: {
    cookies: {
      set: (name: string, value: string, options: object) => void;
    };
  },
  redirect: string,
  locale: string,
) {
  res.cookies.set(
    GOOGLE_AUTH_REDIRECT_COOKIE,
    sanitizeAuthRedirect(redirect),
    COOKIE_OPTS,
  );
  res.cookies.set(GOOGLE_AUTH_LOCALE_COOKIE, locale || "ko", COOKIE_OPTS);
}
