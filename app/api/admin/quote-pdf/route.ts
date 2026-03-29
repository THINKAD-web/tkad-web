import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import {
  applyTemplateVars,
  buildQuotePdfBase64,
  htmlToPlainLines,
} from "@/lib/quote-pdf-server";
import {
  isEmailConfigured,
  sendEmailWithPdfAttachment,
} from "@/lib/email/client";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const vars: Record<string, string> = {};
  const rawVars = body.vars;
  if (rawVars && typeof rawVars === "object" && !Array.isArray(rawVars)) {
    for (const [k, v] of Object.entries(rawVars as Record<string, unknown>)) {
      vars[k] = String(v ?? "");
    }
  }

  const db = getPrisma();
  let headerHtml = "";
  let footerHtml = "";
  let bodyHtml = "";

  const templateId = String(body.templateId ?? "").trim();
  if (templateId) {
    const t = await db.quoteTemplate.findUnique({ where: { id: templateId } });
    if (!t) return json({ error: "Template not found" }, 404);
    headerHtml = t.headerHtml ?? "";
    footerHtml = t.footerHtml ?? "";
    bodyHtml = t.bodyHtml;
  } else {
    const t = await db.quoteTemplate.findFirst({
      where: { isDefault: true },
    });
    if (t) {
      headerHtml = t.headerHtml ?? "";
      footerHtml = t.footerHtml ?? "";
      bodyHtml = t.bodyHtml;
    } else {
      bodyHtml = [
        "고객사: {{company}}",
        "담당자: {{name}}",
        "연락처: {{phone}}",
        "이메일: {{email}}",
        "",
        "견적 요약",
        "예상 집행액: {{amount}}원 (VAT 별도)",
        "기간: {{period}}",
        "",
        "{{message}}",
      ].join("\n");
    }
  }

  const merged = [
    applyTemplateVars(headerHtml, vars),
    applyTemplateVars(bodyHtml, vars),
    applyTemplateVars(footerHtml, vars),
  ].join("\n\n");

  const lines = htmlToPlainLines(merged);
  const pdfBase64 = buildQuotePdfBase64(lines);

  const emailTo = String(body.emailTo ?? "").trim();
  if (emailTo) {
    if (!EMAIL_RE.test(emailTo)) {
      return json({ error: "Invalid emailTo" }, 400);
    }
    if (!isEmailConfigured()) {
      return json({ error: "Email not configured", code: "EMAIL_DISABLED" }, 503);
    }
    try {
      await sendEmailWithPdfAttachment({
        to: emailTo,
        subject: String(body.emailSubject ?? "").trim() || "[THINKAD] 견적서 PDF",
        text: "첨부 PDF를 확인해 주세요.",
        html: "<p>첨부 PDF를 확인해 주세요.</p>",
        pdfFilename: "thinkad-quote.pdf",
        pdfBase64,
      });
      return json({ ok: true, emailed: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send failed";
      return json({ error: msg }, 502);
    }
  }

  return json({ ok: true, pdfBase64 });
}
