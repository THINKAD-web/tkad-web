import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { generateMediaOwnerReport } from "@/lib/media-owner-report-service";
import { sendEmailWithPdfAttachment, isEmailConfigured } from "@/lib/email/client";
import { json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authOk(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function prevMonthKey(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 매월 1일 — 자동 월간 보고서 이메일 */
export async function GET(request: Request) {
  if (!authOk(request)) return json({ error: "Unauthorized" }, 401);
  if (!isDatabaseConfigured()) return json({ error: "No DB" }, 503);
  if (!isEmailConfigured()) return json({ skipped: true, reason: "email-not-configured" });

  const db = getPrisma();
  const owners = await db.mediaOwnerBranding.findMany({
    where: { autoMonthlyReport: true, autoReportEmail: { not: null } },
    select: { ownerUserId: true, autoReportEmail: true, companyName: true },
  });

  const month = prevMonthKey();
  const sent: string[] = [];
  const errors: string[] = [];

  for (const owner of owners) {
    const media = await db.media.findMany({
      where: { ownerUserId: owner.ownerUserId, isActive: true },
      select: { id: true, name: true },
      take: 20,
    });

    for (const m of media) {
      try {
        const result = await generateMediaOwnerReport({
          ownerUserId: owner.ownerUserId,
          mediaId: m.id,
          reportType: "MONTHLY",
          periodMonth: month,
          skipDownloadLimit: true,
        });
        if ("error" in result) {
          errors.push(`${m.id}: ${result.error}`);
          continue;
        }
        await sendEmailWithPdfAttachment({
          to: owner.autoReportEmail!,
          subject: `[${owner.companyName ?? "THINKAD"}] ${m.name} ${month} 월간 성과 보고서`,
          html: `<p>${m.name} ${month} 월간 성과 보고서를 첨부합니다.</p>`,
          pdfFilename: result.filename,
          pdfBase64: Buffer.from(result.buffer).toString("base64"),
        });
        sent.push(`${owner.autoReportEmail}:${m.id}`);
      } catch (e) {
        errors.push(`${m.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return json({ ok: true, month, sent: sent.length, errors });
}
