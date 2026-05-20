import { NextRequest, NextResponse } from "next/server";
import {
  AB_COOKIE_NAME,
  AB_TEST_KEY,
  isAbVariant,
  type AbVariant,
} from "@/lib/ab-testing";
import { recordAbEvent } from "@/lib/ab-test-db";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set(["cta_click", "hero_impression"]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, private" },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = typeof body.event === "string" ? body.event.trim() : "";
  const page = typeof body.page === "string" ? body.page.trim() : "/";
  const testKey =
    typeof body.testKey === "string" && body.testKey.trim()
      ? body.testKey.trim()
      : AB_TEST_KEY;

  if (!ALLOWED_EVENTS.has(event)) {
    return json({ error: "Invalid event" }, 400);
  }

  const bodyVariant =
    typeof body.variant === "string" ? body.variant.trim().toLowerCase() : "";
  let variant: AbVariant | null = isAbVariant(bodyVariant) ? bodyVariant : null;
  if (!variant) {
    const cookie = request.cookies.get(AB_COOKIE_NAME)?.value;
    if (isAbVariant(cookie)) variant = cookie;
  }
  if (!variant) {
    return json({ error: "variant required" }, 400);
  }

  const saved = await recordAbEvent({ variant, event, page, testKey });
  return json({ ok: true, saved });
}
