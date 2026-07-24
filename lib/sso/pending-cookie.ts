import { cookies } from "next/headers";
import {
  SSO_PENDING_COOKIE,
  SSO_PENDING_MAX_AGE_SEC,
} from "@/lib/sso/constants";
import {
  sanitizeSsoReturnTo,
  sanitizeSsoState,
} from "@/lib/sso/return-to";

export type SsoPending = {
  returnTo: string;
  state: string;
  locale: string;
};

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SSO_PENDING_MAX_AGE_SEC,
  };
}

export async function setSsoPendingCookie(pending: SsoPending): Promise<void> {
  const store = await cookies();
  const payload = Buffer.from(JSON.stringify(pending), "utf8").toString(
    "base64url",
  );
  store.set(SSO_PENDING_COOKIE, payload, cookieOpts());
}

export async function readSsoPendingCookie(): Promise<SsoPending | null> {
  const store = await cookies();
  const raw = store.get(SSO_PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(json) as Partial<SsoPending>;
    const returnTo = sanitizeSsoReturnTo(data.returnTo ?? null);
    const state = sanitizeSsoState(data.state ?? null);
    const locale =
      data.locale === "en" || data.locale === "ko" ? data.locale : "ko";
    if (!state) return null;
    return { returnTo, state, locale };
  } catch {
    return null;
  }
}

export async function clearSsoPendingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SSO_PENDING_COOKIE);
}
