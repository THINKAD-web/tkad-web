import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { buildProTrialExpiringEmail } from "@/lib/email/pro-trial-expiring";
import { notifyProTrialExpiringSoon } from "@/lib/kakao-alimtalk-notify";
import { siteUrl } from "@/lib/seo";

const MS_DAY = 24 * 60 * 60 * 1000;

export async function runProTrialCron(): Promise<{
  remindersSent: number;
  remindersSkipped: number;
  downgraded: number;
}> {
  if (!isDatabaseConfigured()) {
    return { remindersSent: 0, remindersSkipped: 0, downgraded: 0 };
  }

  const db = getPrisma();
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * MS_DAY);

  let remindersSent = 0;
  let remindersSkipped = 0;
  let downgraded = 0;

  const expiringSoon = await db.user.findMany({
    where: {
      deletedAt: null,
      plan: "PRO_TRIAL",
      trialEndsAt: { gt: now, lte: in3Days },
      trialReminderSentAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      phone: true,
      trialEndsAt: true,
    },
    take: 100,
  });

  const base = siteUrl.replace(/\/$/, "");
  const pricingLink = `${base}/ko/pricing`;

  for (const u of expiringSoon) {
    const locale = u.locale === "en" ? "en" : "ko";
    const mail = buildProTrialExpiringEmail({
      name: u.name,
      locale,
      pricingHref: `${base}/${locale}/pricing`,
    });

    try {
      if (isEmailConfigured()) {
        await sendEmail({
          to: u.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
      }

      if (u.phone?.trim()) {
        await notifyProTrialExpiringSoon({
          phone: u.phone,
          name: u.name,
          link: pricingLink,
        });
      }

      await db.user.update({
        where: { id: u.id },
        data: { trialReminderSentAt: now },
      });
      remindersSent += 1;
    } catch (e) {
      console.error("[pro-trial-cron] reminder", u.id, e);
      remindersSkipped += 1;
    }
  }

  const expired = await db.user.updateMany({
    where: {
      deletedAt: null,
      plan: "PRO_TRIAL",
      trialEndsAt: { lt: now },
    },
    data: { plan: "FREE" },
  });
  downgraded += expired.count;

  const legacyExpired = await db.user.updateMany({
    where: {
      deletedAt: null,
      plan: "FREE",
      proTrialEndsAt: { lt: now },
      trialEndsAt: null,
    },
    data: { proTrialEndsAt: null },
  });
  downgraded += legacyExpired.count;

  return { remindersSent, remindersSkipped, downgraded };
}
