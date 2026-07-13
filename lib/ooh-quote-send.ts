import { OoHQuoteStatus, type OoHQuote, type PrismaClient } from "@prisma/client";
import { siteUrl } from "@/lib/seo";
import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";
import { quotePdfBase64FromRow } from "@/lib/quote-export/build-payload";
import { notifyQuoteSent } from "@/lib/kakao-alimtalk-notify";
import { notifyUserByEmail } from "@/lib/notifications";
import { postInternalAlert } from "@/lib/internal-webhook";
import { notifySlackQuoteSent } from "@/lib/quote-slack-notify";

const PHONE_RE = /^[\d\-+() ]{8,}$/;

export type SendOoHQuoteResult = {
  emailed: boolean;
  alimtalk: boolean;
  quote: OoHQuote;
};

export async function sendOoHQuoteToClient(
  db: PrismaClient,
  quoteId: string,
  opts?: { forceResend?: boolean },
): Promise<SendOoHQuoteResult> {
  const ooh = await db.ooHQuote.findUnique({ where: { id: quoteId } });
  if (!ooh) throw new Error("NOT_FOUND");

  if (
    ooh.status !== OoHQuoteStatus.draft &&
    ooh.status !== OoHQuoteStatus.sent &&
    !opts?.forceResend
  ) {
    throw new Error("INVALID_STATUS");
  }

  const localeStr = ooh.locale === "en" ? "en" : "ko";
  const clientEmail = ooh.clientEmail?.trim() ?? "";
  let emailed = false;

  if (clientEmail && isEmailConfigured()) {
    const pdfBase64 = await quotePdfBase64FromRow(db, ooh);

    const previewPath = `/${localeStr}/quote/${ooh.id}/preview`;
    const isKo = localeStr === "ko";

    await sendEmailWithPdfAttachment({
      to: clientEmail,
      subject: isKo
        ? "[싱커드] 견적서가 발송되었습니다"
        : "[THINKAD] Your quote is ready",
      text: isKo
        ? `견적서 PDF를 첨부합니다.\n\n온라인 확인: ${siteUrl}${previewPath}\n유효기간: ${ooh.validUntil?.toISOString().slice(0, 10) ?? "14일"}`
        : `Please find your quote attached.\n\nView online: ${siteUrl}${previewPath}`,
      html: isKo
        ? `<p>견적서를 첨부합니다.</p><p><a href="${siteUrl}${previewPath}"><strong>견적 미리보기 →</strong></a></p>`
        : `<p>Please find your quote attached.</p><p><a href="${siteUrl}${previewPath}"><strong>View quote →</strong></a></p>`,
      pdfFilename: `thinkad-quote-${ooh.id.slice(0, 8)}.pdf`,
      pdfBase64,
    });
    emailed = true;
  }

  const updated = await db.ooHQuote.update({
    where: { id: quoteId },
    data: {
      status: OoHQuoteStatus.sent,
      quotePdfSentAt: emailed ? new Date() : ooh.quotePdfSentAt ?? new Date(),
    },
  });

  let alimtalk = false;
  const phone = ooh.clientPhone?.trim() ?? "";
  if (phone && PHONE_RE.test(phone)) {
    try {
      await notifyQuoteSent({
        phone,
        name: ooh.clientName,
        quoteId: ooh.id,
        link: `${siteUrl}/${localeStr}/quote/${ooh.id}/preview`,
      });
      alimtalk = true;
    } catch (e) {
      console.error("[ooh-quote-send] alimtalk:", e);
    }
  }

  void postInternalAlert({
    type: "quote_request",
    title: "견적 발송 완료",
    body: `${ooh.clientName} · ₩${ooh.totalAmount.toLocaleString("ko-KR")}만`,
    meta: { oohQuoteId: ooh.id },
  }).catch(() => {});

  void notifySlackQuoteSent({
    quoteId: ooh.id,
    clientName: ooh.clientName,
    totalAmountManwon: ooh.totalAmount,
    emailed,
    alimtalk,
  }).catch(() => {});

  if (clientEmail) {
    void notifyUserByEmail(clientEmail, {
      type: "QUOTE_RECEIVED",
      title: "견적서가 도착했어요",
      body: "견적서를 확인해 주세요.",
      link: `/quote/${ooh.id}/preview`,
      dedupeKey: `quote_sent:${ooh.id}`,
    }).catch((e) => console.error("[ooh-quote-send] push:", e));
  }

  return { emailed, alimtalk, quote: updated };
}
