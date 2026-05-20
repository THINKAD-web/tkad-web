import { NextRequest } from "next/server";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { renderTemplate } from "@/lib/crm-email-templates-defaults";
import {
  isEmailConfigured,
  sendEmailWithResult,
} from "@/lib/email/client";
import { getPrisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const to = String(body.to ?? "").trim();
  const accountId = String(body.accountId ?? "").trim() || null;
  if (!to || !EMAIL_RE.test(to)) {
    return json({ error: "Valid to email required" }, 400);
  }

  const db = getPrisma();
  const template = await db.emailTemplate.findUnique({ where: { id } });
  if (!template) return json({ error: "Template not found" }, 404);

  let account: {
    company: string;
    name: string;
    assignedTo: string | null;
  } | null = null;
  if (accountId) {
    account = await db.crmAccount.findUnique({
      where: { id: accountId },
      select: { company: true, name: true, assignedTo: true },
    });
  }

  const vars: Record<string, string> = {
    company: String(body.company ?? account?.company ?? "").trim() || "고객사",
    contactName: String(body.contactName ?? account?.name ?? "").trim() || "담당자",
    assignedTo: String(body.assignedTo ?? account?.assignedTo ?? "THINKAD").trim(),
    campaignName: String(body.campaignName ?? "").trim() || "캠페인",
    quoteLink: String(body.quoteLink ?? `${siteUrl}/ko/quote`).trim(),
    dashboardLink: String(body.dashboardLink ?? `${siteUrl}/ko/my`).trim(),
  };

  const subject = renderTemplate(template.subject, vars);
  const html = renderTemplate(template.bodyHtml, vars);
  const text =
    template.bodyText != null
      ? renderTemplate(template.bodyText, vars)
      : html.replace(/<[^>]+>/g, " ");

  if (!isEmailConfigured()) {
    return json({ ok: true, sent: false, code: "EMAIL_DISABLED" });
  }

  const { sent } = await sendEmailWithResult({ to, subject, text, html });

  if (accountId && sent) {
    await db.crmContactLog.create({
      data: {
        accountId,
        channel: "email",
        kind: "email",
        summary: `템플릿 발송: ${template.name} → ${to}`,
      },
    });
    await db.crmAccount.update({
      where: { id: accountId },
      data: { lastContactAt: new Date() },
    });
  }

  return json({ ok: true, sent }, sent ? 200 : 502);
}
