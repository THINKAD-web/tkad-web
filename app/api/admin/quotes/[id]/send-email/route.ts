import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { adminFormalQuotePdfBuffer } from "@/lib/build-admin-formal-quote-pdf";
import { quoteToPdfParams } from "@/lib/admin-sales-quote";
import { loadThinkadLogoDataUrl } from "@/lib/quote-pdf-assets";
import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";
import { notifyUserByEmail } from "@/lib/notifications";
import { notifyQuoteSent } from "@/lib/kakao-alimtalk-notify";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  if (!isEmailConfigured()) {
    return json({ error: "Email not configured", code: "EMAIL_DISABLED" }, 503);
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      body = raw as Record<string, unknown>;
    }
  } catch {
    /* empty body ok */
  }

  const { id } = await ctx.params;
  const db = getPrisma();
  const q = await db.quote.findUnique({
    where: { id },
    include: { items: { orderBy: { id: "asc" } } },
  });
  if (!q) return json({ error: "Not found" }, 404);

  const toRaw =
    typeof body.to === "string" && body.to.trim()
      ? body.to.trim()
      : q.clientEmail?.trim() ?? "";
  if (!toRaw || !EMAIL_RE.test(toRaw)) {
    return json({ error: "Valid recipient email (to) required" }, 400);
  }

  const subject =
    typeof body.subject === "string" && body.subject.trim()
      ? body.subject.trim()
      : q.isKo
        ? `[THINKAD] 견적서 ${q.quoteNumber}`
        : `[THINKAD] Quote ${q.quoteNumber}`;

  const logo = loadThinkadLogoDataUrl();
  const params = quoteToPdfParams(q, { logoDataUrl: logo });

  let pdfBase64: string;
  try {
    const buf = await adminFormalQuotePdfBuffer(params);
    pdfBase64 = buf.toString("base64");
  } catch (e) {
    console.error("[admin-quotes send-email pdf]", e);
    return json({ error: "PDF build failed" }, 500);
  }

  const text = q.isKo
    ? `안녕하세요.\n\n견적서(${q.quoteNumber})를 첨부합니다.\n\n싱커드 THINKAD`
    : `Hello,\n\nPlease find the quote (${q.quoteNumber}) attached.\n\nTHINKAD`;

  try {
    await sendEmailWithPdfAttachment({
      to: toRaw,
      subject,
      text,
      html: `<p>${q.isKo ? "견적서를 첨부합니다." : "Please find the quote attached."}</p>`,
      pdfFilename: `thinkad-quote-${q.quoteNumber.replace(/[^\w.-]+/g, "_")}.pdf`,
      pdfBase64,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send failed";
    return json({ error: msg }, 502);
  }

  const updated = await db.quote.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      clientEmail: toRaw,
    },
  });

  void notifyUserByEmail(toRaw, {
    type: "QUOTE_RECEIVED",
    title: "견적서가 도착했습니다",
    body: q.isKo
      ? `견적번호 ${q.quoteNumber}`
      : `Quote ${q.quoteNumber}`,
    link: `/quote/${id}`,
    dedupeKey: `quote_sent:${id}`,
  });

  const quotePhone = q.clientPhone?.trim();
  if (quotePhone) {
    const base = (
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.SITE_URL?.trim() ||
      siteUrl
    ).replace(/\/$/, "");
    void notifyQuoteSent({
      phone: quotePhone,
      name: q.clientName?.trim() || "고객",
      quoteNumber: q.quoteNumber,
      quoteId: id,
      link: `${base}/ko/quote/${id}`,
    }).catch((err) => console.error("[admin-quotes send-email] alimtalk:", err));
  }

  return json({
    ok: true,
    quote: {
      id: updated.id,
      status: updated.status,
      sentAt: updated.sentAt?.toISOString() ?? null,
    },
  });
}
