import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { syncPipelineStageForOoHQuote } from "@/lib/crm-pipeline-sync";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { canWithdrawProceed } from "@/lib/ooh-quote";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 8, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(
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

  let body: Record<string, unknown> = {};
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      body = (await request.json()) as Record<string, unknown>;
    }
  } catch {
    body = {};
  }
  if (body.website) {
    return json({ success: true }, { status: 201 });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return json({ error: "Not found" }, { status: 404 });
    if (!canWithdrawProceed(row.status)) {
      return json(
        { error: "Cannot withdraw at this stage", status: row.status },
        { status: 409 },
      );
    }

    const result = await db.ooHQuote.updateMany({
      where: {
        id,
        status: OoHQuoteStatus.booking_requested,
      },
      data: {
        status: OoHQuoteStatus.sent,
        bookingRequestedAt: null,
      },
    });

    if (result.count === 0) {
      const current = await db.ooHQuote.findUnique({
        where: { id },
        select: { status: true },
      });
      return json(
        {
          error: "Status changed; withdraw no longer available",
          status: current?.status ?? "unknown",
        },
        { status: 409 },
      );
    }

    await syncPipelineStageForOoHQuote(db, id);

    return json({ success: true, status: OoHQuoteStatus.sent }, { status: 200 });
  } catch (e) {
    console.error("[quote withdraw-proceed]", e);
    return json({ error: "Failed" }, { status: 500 });
  }
}
