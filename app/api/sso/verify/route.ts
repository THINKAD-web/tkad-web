import { NextResponse } from "next/server";
import { consumeSsoCode } from "@/lib/sso/code-store";
import { sanitizeSsoState } from "@/lib/sso/return-to";
import {
  readSsoSharedSecret,
  ssoSecretsEqual,
} from "@/lib/sso/shared-secret";

export const runtime = "nodejs";

type Body = {
  code?: string;
  state?: string;
  secret?: string;
};

function extractSecret(req: Request, body: Body): string | null {
  const header =
    req.headers.get("x-sso-secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (header) return header;
  return body.secret?.trim() || null;
}

/**
 * POST /api/sso/verify
 * Server-to-server only. Body: { code, state }. Auth: X-SSO-Secret or Bearer.
 * Consumes the one-time code and returns { userId, email, accessLevel? }.
 */
export async function POST(req: Request) {
  const expected = readSsoSharedSecret();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: { code: "SSO_NOT_CONFIGURED" } },
      { status: 503 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON" } },
      { status: 400 },
    );
  }

  if (!ssoSecretsEqual(extractSecret(req, body), expected)) {
    return NextResponse.json(
      { ok: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const state = sanitizeSsoState(body.state ?? null);
  if (!code || !state) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_REQUEST" } },
      { status: 400 },
    );
  }

  const payload = await consumeSsoCode(code);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_OR_EXPIRED_CODE" } },
      { status: 400 },
    );
  }

  if (payload.state !== state) {
    return NextResponse.json(
      { ok: false, error: { code: "STATE_MISMATCH" } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      userId: payload.userId,
      email: payload.email,
      ...(payload.accessLevel ? { accessLevel: payload.accessLevel } : {}),
    },
  });
}
