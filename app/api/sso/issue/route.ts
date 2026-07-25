import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user-session";
import { userPlanToAccessLevel } from "@/lib/plan-check-shared";
import { ssoDigitalOrigin } from "@/lib/sso/constants";
import {
  createSsoCodeValue,
  putSsoCode,
} from "@/lib/sso/code-store";
import {
  clearSsoPendingCookie,
  setSsoPendingCookie,
} from "@/lib/sso/pending-cookie";
import {
  sanitizeSsoReturnTo,
  sanitizeSsoState,
} from "@/lib/sso/return-to";
import { readSsoSharedSecret } from "@/lib/sso/shared-secret";

export const runtime = "nodejs";

function loginRedirectUrl(locale: string): string {
  const path = `/${locale}/login?redirect=${encodeURIComponent("/sso/continue")}`;
  return path;
}

/**
 * GET /api/sso/issue?returnTo=&state=&locale=
 * Authenticated → one-time code → redirect to Digital /auth/sso
 * Anonymous → stash params → login → /sso/continue → re-issue
 */
export async function GET(req: Request) {
  if (!readSsoSharedSecret()) {
    return NextResponse.json(
      { ok: false, error: { code: "SSO_NOT_CONFIGURED" } },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const returnTo = sanitizeSsoReturnTo(url.searchParams.get("returnTo"));
  const state = sanitizeSsoState(url.searchParams.get("state"));
  const localeRaw = url.searchParams.get("locale");
  const locale = localeRaw === "en" ? "en" : "ko";

  if (!state) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_STATE" } },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    await setSsoPendingCookie({ returnTo, state, locale });
    return NextResponse.redirect(new URL(loginRedirectUrl(locale), req.url));
  }

  const accessLevel = userPlanToAccessLevel({
    plan: user.plan,
    trialEndsAt: user.trialEndsAt,
    proTrialEndsAt: user.proTrialEndsAt,
  });

  const code = createSsoCodeValue();
  await putSsoCode(code, {
    userId: user.id,
    email: user.email,
    state,
    accessLevel,
  });
  await clearSsoPendingCookie();

  const dest = new URL("/auth/sso", ssoDigitalOrigin());
  dest.searchParams.set("code", code);
  dest.searchParams.set("state", state);
  dest.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(dest);
}
