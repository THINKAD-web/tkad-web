import { MediaApplicationStatus } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { notifySlackMediaApplication } from "@/lib/media-application-slack";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { resolveContactAlertEmail } from "@/lib/email/contact-admin-notify";

const HOURS_24 = 24 * 60 * 60 * 1000;

export async function runMediaApplicationPendingReminders(): Promise<{
  reminded: number;
}> {
  if (!isDatabaseConfigured()) return { reminded: 0 };

  const db = getPrisma();
  const cutoff = new Date(Date.now() - HOURS_24);

  const stale = await db.mediaApplication.findMany({
    where: {
      status: MediaApplicationStatus.PENDING,
      createdAt: { lt: cutoff },
      pendingReminderSentAt: null,
    },
    take: 50,
  });

  let reminded = 0;
  const alertTo = resolveContactAlertEmail();

  for (const app of stale) {
    await notifySlackMediaApplication(app, { overdue: true });

    if (isEmailConfigured()) {
      try {
        await sendEmail({
          to: alertTo,
          subject: `[TKAD] 매체 신청 승인 대기 24h+ — ${app.mediaName}`,
          text: [
            `회사: ${app.companyName}`,
            `매체: ${app.mediaName}`,
            `연락: ${app.contactPhone} / ${app.contactEmail}`,
            `신청 ID: ${app.id}`,
            `관리: /ko/admin/applications?id=${app.id}`,
          ].join("\n"),
          html: `<pre>${app.mediaName}\n${app.id}</pre>`,
        });
      } catch (e) {
        console.error("[media-app-reminder] email", e);
      }
    }

    await db.mediaApplication.update({
      where: { id: app.id },
      data: { pendingReminderSentAt: new Date() },
    });
    reminded += 1;
  }

  return { reminded };
}
