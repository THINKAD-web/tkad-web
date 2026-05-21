import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { recordPageView } from "@/lib/tracking/record";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 120, windowMs: 60_000 });

const Body = z.object({
  sessionId: z.string().min(8).max(64),
  path: z.string().min(1).max(500),
  locale: z.string().max(8).optional(),
  referrer: z.string().max(500).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  landingPath: z.string().max(500).optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers).entries()),
      "Cache-Control": "no-store, private",
    },
  });
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!limiter.check(ip)) {
    return json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent");

  try {
    await recordPageView({
      sessionId: parsed.data.sessionId,
      path: parsed.data.path,
      locale: parsed.data.locale,
      referrer: parsed.data.referrer,
      userAgent: ua,
      utmSource: parsed.data.utmSource,
      utmMedium: parsed.data.utmMedium,
      utmCampaign: parsed.data.utmCampaign,
      utmContent: parsed.data.utmContent,
      utmTerm: parsed.data.utmTerm,
      landingPath: parsed.data.landingPath,
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[tracking/pageview]", e);
    return json({ ok: false }, { status: 500 });
  }
}
