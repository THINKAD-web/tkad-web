import { NextRequest, NextResponse } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { z } from "zod";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { canRequestRevision } from "@/lib/ooh-quote";
import {
  adminOohQuoteUrl,
  sendTelegramMessage,
} from "@/lib/telegram-notify";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifyOohQuoteEvent } from "@/lib/slack-notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const limiter = rateLimit({ limit: 6, windowMs: 60_000 });
const CUID_RE = /^c[a-z0-9]{24,}$/i;

const BodySchema = z.object({
  /** 한국어 위주 입력 → 메모는 500자 까지 */
  note: z.string().min(1).max(500),
  /** 허니팟 — 봇은 채워 보내며, 채워졌으면 200 으로 흘려보냄 */
  website: z.string().optional(),
});

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, private");
  return NextResponse.json(body, { ...init, headers });
}

/**
 * POST /api/quote/[id]/revision-request
 *
 * 고객이 견적 내용에 대해 수정을 요청. status: sent → revision_requested.
 * `revisionNote` 에 메모 저장 + Telegram/Slack/내부 webhook 으로 어드민 즉시 알림.
 *
 * 보안:
 *  - Quote id 는 CUID 형식만 허용
 *  - 1분당 IP 기준 6회로 rate limit
 *  - honeypot 통과 시 200 만 반환 (실 변경 없음)
 */
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

  let raw: unknown = null;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      raw = await request.json();
    }
  } catch {
    raw = null;
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid body" }, { status: 400 });
  }
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    // honeypot — 실 처리 없이 성공으로 흘려 보냄
    return json({ success: true }, { status: 200 });
  }

  try {
    const db = getPrisma();
    const row = await db.ooHQuote.findUnique({ where: { id } });
    if (!row) return json({ error: "Not found" }, { status: 404 });
    if (!canRequestRevision(row.status)) {
      return json(
        {
          error: "Cannot request revision at this stage",
          status: row.status,
        },
        { status: 409 },
      );
    }

    await db.ooHQuote.update({
      where: { id },
      data: {
        status: OoHQuoteStatus.revision_requested,
        revisionRequestedAt: new Date(),
        revisionNote: parsed.data.note.trim(),
        revisionResolvedAt: null,
      },
    });

    const adminUrl = adminOohQuoteUrl(id);

    void postInternalAlert({
      type: "ooh_revision_request",
      title: "견적 수정 요청 (고객)",
      body: `${row.clientName} · ₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period}\n${parsed.data.note.slice(0, 240)}`,
      meta: { oohQuoteId: id, email: row.clientEmail },
    }).catch(() => {});

    void sendTelegramMessage(
      `<b>견적 수정 요청</b>\n${row.clientName}\n₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period}\n메모: ${parsed.data.note.slice(0, 240)}`,
      { buttons: [{ text: "확인하기", url: adminUrl }] },
    ).catch(() => {});

    void notifyOohQuoteEvent({
      title: "견적 수정 요청 (고객)",
      bodyMd: `*${row.clientName}* · ₩${row.totalAmount.toLocaleString("ko-KR")}만 · ${row.period}\n>${parsed.data.note.slice(0, 240)}`,
      adminUrl,
    }).catch(() => {});

    return json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("[quote revision-request]", e);
    return json({ error: "Failed" }, { status: 500 });
  }
}
