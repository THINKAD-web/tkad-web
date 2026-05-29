import { NextRequest, NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { serializeOoHQuotePublic } from "@/lib/ooh-quote";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 60, windowMs: 60_000 });

const CUID_RE = /^c[a-z0-9]{24,}$/i;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (!limiter.check(ip)) {
    return json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await ctx.params;
  if (!id || !CUID_RE.test(id)) {
    return json({ error: "Not found" }, { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({
      where: { id },
      include: { oohContract: true },
    });
    if (!row) return json({ error: "Not found" }, { status: 404 });
    const { oohContract, ...quote } = row;
    return json({ quote: serializeOoHQuotePublic(quote, oohContract) });
  } catch (e) {
    console.error("[quote GET]", e);
    return json({ error: "Failed" }, { status: 500 });
  }
}
