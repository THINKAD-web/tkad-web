import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  INTEGRATED_MIX_TRIAL_COOKIE,
  hasUsedIntegratedMixTrial,
  integratedMixNeedLoginBody,
  integratedMixTrialCookieOptions,
} from "@/lib/integrated/mix-trial-cookie";
import { runIntegratedMix } from "@/lib/integrated/run-integrated-mix";
import { integratedMixRequestSchema } from "@/lib/integrated/schemas";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const user = await getCurrentUser();
  const rateKey = user?.id ?? ip;

  const rl = await enforceRateLimit("integratedMix", rateKey);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: rl.message },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }

  let setTrialCookie = false;
  if (!user) {
    const jar = await cookies();
    if (hasUsedIntegratedMixTrial(jar.get(INTEGRATED_MIX_TRIAL_COOKIE)?.value)) {
      return NextResponse.json(integratedMixNeedLoginBody(), { status: 401 });
    }
    setTrialCookie = true;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_FAILED", message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = integratedMixRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_FAILED",
        message: "Validation failed",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const result = await runIntegratedMix(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.status },
    );
  }

  const res = NextResponse.json(result.response);
  if (setTrialCookie) {
    res.cookies.set(
      INTEGRATED_MIX_TRIAL_COOKIE,
      "1",
      integratedMixTrialCookieOptions(),
    );
  }
  return res;
}
