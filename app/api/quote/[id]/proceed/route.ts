import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { canProceedBooking } from "@/lib/ooh-quote";
import {
  adminOohQuoteUrl,
  sendTelegramMessage,
} from "@/lib/telegram-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackBookingRequest } from "@/lib/quote-slack-notify";

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
    if (!canProceedBooking(row.status)) {
      return json(
        { error: "Cannot proceed at this stage", status: row.status },
        { status: 409 },
      );
    }

    await db.ooHQuote.update({
      where: { id },
      data: {
        status: OoHQuoteStatus.booking_requested,
        bookingRequestedAt: new Date(),
      },
    });

    void postInternalAlert({
      type: "ooh_booking_request",
      title: "부킹 요청 (고객 진행 의사)",
      body: `${row.clientName} · ₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period}`,
      meta: { oohQuoteId: id, email: row.clientEmail },
    }).catch(() => {});

    const adminUrl = adminOohQuoteUrl(id);
    void sendTelegramMessage(
      `<b>부킹 요청</b>\n${row.clientName}\n₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period}\n매체 ${row.mediaIds.length}건`,
      { buttons: [{ text: "확인하기", url: adminUrl }] },
    ).catch(() => {});

    void notifySlackBookingRequest({
      quoteId: id,
      clientName: row.clientName,
      totalAmountManwon: row.totalAmount,
      period: row.period,
      mediaCount: row.mediaIds.length,
    }).catch((e) => console.error("[quote proceed] slack", e));

    return json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("[quote proceed]", e);
    return json({ error: "Failed" }, { status: 500 });
  }
}
