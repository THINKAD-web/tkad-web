import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { canAdminBookingConfirm } from "@/lib/ooh-quote";
import { ensureOohContractExists } from "@/lib/ooh-contract-ensure";
import { isEmailConfigured, sendEmail } from "@/lib/email/client";
import { notifySlackBookingConfirm } from "@/lib/quote-slack-notify";

export const dynamic = "force-dynamic";

function siteBaseUrl(): string {
  return (
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  const { id } = await ctx.params;
  const db = getPrisma();
  const row = await db.ooHQuote.findUnique({ where: { id } });
  if (!row) return json({ error: "Not found" }, 404);
  if (!canAdminBookingConfirm(row.status)) {
    return json({ error: "Invalid status for this action" }, 409);
  }

  const updated = await db.ooHQuote.update({
    where: { id },
    data: {
      status: OoHQuoteStatus.booking_confirmed,
      bookingConfirmedAt: new Date(),
    },
  });

  await ensureOohContractExists(db, id, updated.status);

  void notifySlackBookingConfirm({
    quoteId: id,
    clientName: row.clientName,
    totalAmountManwon: row.totalAmount,
    period: row.period,
    mediaCount: row.mediaIds.length,
    source: "admin",
  }).catch((e) => console.error("[booking-confirm] slack", e));

  const to = row.clientEmail?.trim();
  if (to && isEmailConfigured()) {
    const isKo = row.locale !== "en";
    const loc = row.locale === "en" ? "en" : "ko";
    const url = `${siteBaseUrl()}/${loc}/quote/${id}/contract`;
    try {
      await sendEmail({
        to,
        subject: isKo
          ? "[싱커드] 부킹 확정 — 전자계약서를 확인해 주세요"
          : "[THINKAD] Booking confirmed — please review your e-contract",
        text: isKo
          ? `안녕하세요 ${row.clientName}님,\n\n부킹이 확정되었습니다. 아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.\n\n${url}\n\n감사합니다.`
          : `Hello ${row.clientName},\n\nYour booking is confirmed. Please open the link to review and sign the contract:\n\n${url}\n\nThank you.`,
        html: isKo
          ? `<p>안녕하세요 <strong>${row.clientName}</strong>님,</p><p>부킹이 확정되었습니다. 아래 링크에서 계약서를 확인하고 전자서명을 진행해 주세요.</p><p><a href="${url}">${url}</a></p>`
          : `<p>Hello <strong>${row.clientName}</strong>,</p><p>Your booking is confirmed. Please review and sign:</p><p><a href="${url}">${url}</a></p>`,
      });
    } catch (e) {
      console.error("[booking-confirm] contract invite email", e);
    }
  }

  return json({ ok: true, status: updated.status });
}
