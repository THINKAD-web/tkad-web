import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { canRequestRevision } from "@/lib/ooh-quote";
import { rateLimit } from "@/lib/rate-limit";
import {
  adminOohQuoteUrl,
  sendTelegramMessage,
} from "@/lib/telegram-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackRevisionRequest } from "@/lib/quote-slack-notify";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ limit: 8, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;
const REVISION_MESSAGE_MIN = 3;
const REVISION_MESSAGE_MAX = 2000;

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

function normalizeRevisionMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < REVISION_MESSAGE_MIN) return null;
  return trimmed.slice(0, REVISION_MESSAGE_MAX);
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

  const message = normalizeRevisionMessage(body.message ?? body.revisionMessage);
  if (!message) {
    return json({ error: "message required (3–2000 chars)" }, { status: 400 });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return json({ error: "Not found" }, { status: 404 });
    if (!canRequestRevision(row.status)) {
      return json(
        { error: "Cannot request revision at this stage", status: row.status },
        { status: 409 },
      );
    }

    const now = new Date();
    const result = await db.ooHQuote.updateMany({
      where: {
        id,
        status: OoHQuoteStatus.sent,
      },
      data: {
        revisionMessage: message,
        revisionRequestedAt: now,
      },
    });

    if (result.count === 0) {
      const current = await db.ooHQuote.findUnique({
        where: { id },
        select: { status: true },
      });
      return json(
        {
          error: "Status changed; revision request no longer available",
          status: current?.status ?? "unknown",
        },
        { status: 409 },
      );
    }

    const preview = message.length > 120 ? `${message.slice(0, 120)}…` : message;
    void postInternalAlert({
      type: "ooh_quote_revision_request",
      title: "견적 수정 요청 (고객)",
      body: `${row.clientName} · ${preview}`,
      meta: { oohQuoteId: id, email: row.clientEmail },
    }).catch(() => {});

    const adminUrl = adminOohQuoteUrl(id);
    void sendTelegramMessage(
      `<b>견적 수정 요청</b>\n${row.clientName}\n${preview}`,
      { buttons: [{ text: "확인하기", url: adminUrl }] },
    ).catch(() => {});

    void notifySlackRevisionRequest({
      quoteId: id,
      clientName: row.clientName,
      preview,
    }).catch((e) => console.error("[quote revision-request] slack", e));

    return json(
      {
        success: true,
        revisionRequestedAt: now.toISOString(),
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[quote revision-request]", e);
    return json({ error: "Failed" }, { status: 500 });
  }
}
