/**
 * 견적 검토 완료 → 원클릭 발송 (이메일 PDF + 알림톡, status → sent).
 */

import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { sendOoHQuoteToClient } from "@/lib/ooh-quote-send";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await context.params;
  const db = getPrisma();
  const ooh = await db.ooHQuote.findUnique({ where: { id } });
  if (!ooh) return json({ error: "not_found" }, 404);

  if (
    ooh.status !== OoHQuoteStatus.draft &&
    ooh.status !== OoHQuoteStatus.sent
  ) {
    return json({ error: "invalid_status", status: ooh.status }, 400);
  }

  try {
    const result = await sendOoHQuoteToClient(db, id, {
      forceResend: ooh.status === OoHQuoteStatus.sent,
    });
    return json({
      ok: true,
      emailed: result.emailed,
      alimtalk: result.alimtalk,
      quote: {
        id: result.quote.id,
        status: result.quote.status,
        quotePdfSentAt: result.quote.quotePdfSentAt?.toISOString() ?? null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    if (msg === "NOT_FOUND") return json({ error: "not_found" }, 404);
    if (msg === "INVALID_STATUS") {
      return json({ error: "invalid_status" }, 400);
    }
    console.error("[admin/ooh-quotes/send-quote]", e);
    return json({ error: "send_failed" }, 500);
  }
}
