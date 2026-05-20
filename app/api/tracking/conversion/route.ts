import { NextRequest, NextResponse } from "next/server";
import { ConversionEventType } from "@prisma/client";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { recordConversion } from "@/lib/tracking/record";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 60, windowMs: 60_000 });

const Body = z.object({
  type: z.nativeEnum(ConversionEventType),
  sessionId: z.string().min(8).max(64).optional(),
  path: z.string().max(500).optional(),
  mediaId: z.string().max(64).optional(),
  userId: z.string().max(64).optional(),
  metadata: z.record(z.unknown()).optional(),
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

  try {
    await recordConversion(parsed.data);
    return json({ ok: true });
  } catch (e) {
    console.error("[tracking/conversion]", e);
    return json({ ok: false }, { status: 500 });
  }
}
