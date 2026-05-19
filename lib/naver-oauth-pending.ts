import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const NAVER_PENDING_COOKIE = "tkad_naver_oauth_pending";
const MAX_AGE_SEC = 60 * 15;

export type { KakaoSignupRole as NaverSignupRole } from "@/lib/kakao-oauth-pending";
export {
  communityRoleFromSignupRole,
  appRoleFromSignupRole,
} from "@/lib/kakao-oauth-pending";

export type NaverPendingPayload = {
  v: 1;
  providerAccountId: string;
  email: string;
  name: string;
  image?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  redirect: string;
  exp: number;
};

function pendingSecret(): string | null {
  const s =
    process.env.AUTH_SECRET?.trim() ||
    process.env.USER_SESSION_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-naver-pending-secret";
  }
  return null;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodePending(data: NaverPendingPayload): string | null {
  const secret = pendingSecret();
  if (!secret) return null;
  const json = JSON.stringify(data);
  const sig = signPayload(json, secret);
  const enc = Buffer.from(json, "utf8").toString("base64url");
  return `${enc}.${sig}`;
}

function decodePending(token: string): NaverPendingPayload | null {
  const secret = pendingSecret();
  if (!secret) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const enc = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!enc || !sig) return null;

  let payload: string;
  try {
    payload = Buffer.from(enc, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = signPayload(payload, secret);
  try {
    if (
      expected.length !== sig.length ||
      !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  let data: NaverPendingPayload;
  try {
    data = JSON.parse(payload) as NaverPendingPayload;
  } catch {
    return null;
  }

  if (
    data.v !== 1 ||
    typeof data.providerAccountId !== "string" ||
    typeof data.email !== "string" ||
    typeof data.name !== "string" ||
    typeof data.redirect !== "string" ||
    typeof data.exp !== "number"
  ) {
    return null;
  }
  if (Date.now() > data.exp) return null;
  return data;
}

export async function setNaverPending(
  data: Omit<NaverPendingPayload, "v" | "exp">,
): Promise<boolean> {
  const token = encodePending({
    v: 1,
    ...data,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  });
  if (!token) return false;

  const cookieStore = await cookies();
  cookieStore.set(NAVER_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
  return true;
}

export async function readNaverPending(): Promise<NaverPendingPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(NAVER_PENDING_COOKIE)?.value;
  if (!raw) return null;
  return decodePending(raw);
}

export async function clearNaverPending(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(NAVER_PENDING_COOKIE);
}
