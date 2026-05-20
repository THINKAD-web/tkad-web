/**
 * 견적 만료 처리 — sent 상태 + validUntil 경과 → expired.
 * D-3: 만료 예정 알림 (이메일·알림톡·어드민 웹훅).
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 * 스케줄: 0 15 * * * (UTC) = KST 00:00 매일
 */

import { NextRequest } from "next/server";
import { OoHQuoteStatus } from "@prisma/client";
import { json } from "@/lib/admin-guard";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackQuoteExpiring } from "@/lib/quote-slack-notify";
import { notifyQuoteExpiringSoon } from "@/lib/kakao-alimtalk-notify";
import { siteUrl } from "@/lib/seo";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MS_DAY = 86_400_000;

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "no_database" }, 200);
  }

  const db = getPrisma();
  const now = new Date();
  const in3 = new Date(now.getTime() + 3 * MS_DAY);

  const expiringSoon = await db.ooHQuote.findMany({
    where: {
      status: OoHQuoteStatus.sent,
      validUntil: { gt: now, lte: in3 },
      expiryNoticeSentAt: null,
    },
    take: 50,
  });

  let expiryNotices = 0;
  for (const q of expiringSoon) {
    const locale = q.locale === "en" ? "en" : "ko";
    const preview = `${siteUrl}/${locale}/quote/${q.id}/preview`;
    const validStr = q.validUntil?.toISOString().slice(0, 10) ?? "";

    if (q.clientPhone?.trim()) {
      try {
        await notifyQuoteExpiringSoon({
          phone: q.clientPhone,
          name: q.clientName,
          link: preview,
          validUntil: validStr,
        });
      } catch (e) {
        console.error("[cron/expire-quotes] alimtalk D-3:", e);
      }
    }

    if (q.clientEmail?.includes("@") && !q.clientEmail.includes("no-reply")) {
      try {
        const isKo = locale === "ko";
        await sendEmail({
          to: q.clientEmail,
          subject: isKo
            ? "[싱커드] 견적 만료 예정 안내"
            : "[THINKAD] Your quote expires soon",
          text: isKo
            ? `${q.clientName}님, 견적 유효기간이 ${validStr}까지입니다.\n확인: ${preview}`
            : `Hi ${q.clientName}, your quote is valid until ${validStr}.\nView: ${preview}`,
          html: isKo
            ? `<p>${q.clientName}님, 견적 유효기간이 <strong>${validStr}</strong>까지입니다.</p><p><a href="${preview}">견적 확인 →</a></p>`
            : `<p>Hi ${q.clientName}, your quote is valid until <strong>${validStr}</strong>.</p><p><a href="${preview}">View quote →</a></p>`,
        });
      } catch (e) {
        console.error("[cron/expire-quotes] email D-3:", e);
      }
    }

    await db.ooHQuote.update({
      where: { id: q.id },
      data: { expiryNoticeSentAt: now },
    });
    expiryNotices += 1;

    void postInternalAlert({
      type: "quote_expiring",
      title: "견적 만료 D-3",
      body: `${q.clientName} · valid ${validStr}`,
      meta: { oohQuoteId: q.id },
    }).catch(() => {});

    void notifySlackQuoteExpiring({
      quoteId: q.id,
      clientName: q.clientName,
      validUntil: validStr,
    }).catch(() => {});
  }

  const expired = await db.ooHQuote.updateMany({
    where: {
      status: OoHQuoteStatus.sent,
      validUntil: { lt: now },
    },
    data: { status: OoHQuoteStatus.expired },
  });

  if (expired.count > 0) {
    void postInternalAlert({
      type: "quote_expired",
      title: "견적 만료 처리",
      body: `${expired.count}건 status → expired`,
      meta: { count: expired.count },
    }).catch(() => {});
  }

  return json({
    ok: true,
    expiryNotices,
    expiredCount: expired.count,
  });
}
