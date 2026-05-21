import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { touchVisitorJourney } from "@/lib/visitor-journey";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 80, windowMs: 60_000 });

const Body = z.object({
  sessionId: z.string().min(8).max(64),
  step: z.string().min(1).max(64),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  landingPath: z.string().max(500).optional(),
  userId: z.string().max(64).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  mark: z
    .enum([
      "signed_up",
      "quote_requested",
      "guide_downloaded",
      "quick_quote",
      "budget_preview",
    ])
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function json(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store, private" },
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

  const d = parsed.data;
  try {
    await touchVisitorJourney({
      sessionId: d.sessionId,
      step: d.step,
      path: d.path,
      referrer: d.referrer,
      landingPath: d.landingPath,
      userId: d.userId,
      utm: {
        utmSource: d.utmSource,
        utmMedium: d.utmMedium,
        utmCampaign: d.utmCampaign,
        utmContent: d.utmContent,
        utmTerm: d.utmTerm,
      },
      mark: d.mark,
      metadata: d.metadata,
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[tracking/journey]", e);
    return json({ ok: false }, { status: 500 });
  }
}
