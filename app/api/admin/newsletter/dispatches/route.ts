import { NextRequest } from "next/server";
import { z } from "zod";
import { assertAdminDb, json } from "@/lib/admin-guard";
import { getPrisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;
  const db = getPrisma();
  const rows = await db.newsletterDispatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return json({
    items: rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      bodyMd: r.bodyMd,
      localeFilter: r.localeFilter,
      recipientCount: r.recipientCount,
      successCount: r.successCount,
      failedCount: r.failedCount,
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      createdByAdmin: r.createdByAdmin,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

const SendSchema = z.object({
  subject: z.string().min(1).max(200),
  bodyMd: z.string().min(1).max(20_000),
  localeFilter: z.enum(["ko", "en", "all"]).default("all"),
  /** dryRun=true 면 실제 발송 없이 대상 수만 계산 */
  dryRun: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/admin/newsletter/dispatches — 즉시 발송.
 * - 작은 규모용 동기 발송. 활성 구독자 전체에게 sendEmail 로 1통씩 발송.
 * - 어드민 패널에서만 호출. 실패 1건은 카운트만 올리고 계속 진행.
 */
export async function POST(request: NextRequest) {
  const deny = assertAdminDb(request);
  if (deny) return deny;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "invalid_body", issues: parsed.error.flatten() }, 400);
  }

  if (!isEmailConfigured()) {
    return json({ error: "email_not_configured" }, 503);
  }

  const db = getPrisma();
  const where =
    parsed.data.localeFilter === "all"
      ? { unsubscribedAt: null }
      : { unsubscribedAt: null, locale: parsed.data.localeFilter };
  const recipients = await db.newsletterSubscriber.findMany({
    where,
    select: { id: true, email: true, locale: true },
  });

  const recipientCount = recipients.length;

  if (parsed.data.dryRun) {
    return json({
      dryRun: true,
      recipientCount,
      sample: recipients.slice(0, 5).map((r) => r.email),
    });
  }

  const dispatch = await db.newsletterDispatch.create({
    data: {
      subject: parsed.data.subject,
      bodyMd: parsed.data.bodyMd,
      localeFilter: parsed.data.localeFilter,
      recipientCount,
      startedAt: new Date(),
      notes: parsed.data.notes ?? null,
    },
  });

  let success = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      const html = renderHtml(parsed.data.bodyMd);
      await sendEmail({
        to: r.email,
        subject: parsed.data.subject,
        text: parsed.data.bodyMd,
        html,
      });
      success += 1;
      await db.newsletterSubscriber
        .update({
          where: { id: r.id },
          data: { lastSentAt: new Date() },
        })
        .catch(() => {});
    } catch (e) {
      console.error("[newsletter dispatch send]", r.email, e);
      failed += 1;
    }
  }

  await db.newsletterDispatch.update({
    where: { id: dispatch.id },
    data: {
      successCount: success,
      failedCount: failed,
      completedAt: new Date(),
    },
  });

  return json({
    id: dispatch.id,
    recipientCount,
    successCount: success,
    failedCount: failed,
  });
}

/** 매우 단순한 마크다운 → HTML (헤딩·단락만). 외부 lib 추가 없이 안전한 최소치. */
function renderHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lines = escaped.split(/\r?\n/);
  const out: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      out.push("");
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith("## ")) {
      out.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith("# ")) {
      out.push(`<h1>${line.slice(2)}</h1>`);
    } else if (line.startsWith("- ")) {
      out.push(`<li>${line.slice(2)}</li>`);
    } else {
      out.push(`<p>${line}</p>`);
    }
  }
  return out.join("\n");
}
