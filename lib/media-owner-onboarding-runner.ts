import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  buildMediaOwnerOnboardingEmail,
  type OnboardingEmailDay,
} from "@/lib/email/media-owner-onboarding";

const MS_DAY = 24 * 60 * 60 * 1000;

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / MS_DAY);
}

export async function runMediaOwnerOnboardingEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return { sent: 0, skipped: 0 };
  }

  const db = getPrisma();
  const profiles = await db.mediaOwnerProfile.findMany({
    include: {
      user: { select: { email: true, name: true, role: true } },
    },
    take: 200,
  });

  let sent = 0;
  let skipped = 0;

  for (const p of profiles) {
    if (p.user.role !== "owner" && p.user.role !== "admin") {
      skipped += 1;
      continue;
    }

    const hasMedia = p.approvedMediaCount > 0;
    const elapsed = daysSince(p.onboardingStartedAt);

    const schedule: {
      day: OnboardingEmailDay;
      minDay: number;
      sentAt: Date | null;
      field: keyof typeof p;
    }[] = [
      { day: 0, minDay: 0, sentAt: p.emailDay0SentAt, field: "emailDay0SentAt" },
      { day: 1, minDay: 1, sentAt: p.emailDay1SentAt, field: "emailDay1SentAt" },
      { day: 3, minDay: 3, sentAt: p.emailDay3SentAt, field: "emailDay3SentAt" },
      { day: 7, minDay: 7, sentAt: p.emailDay7SentAt, field: "emailDay7SentAt" },
    ];

    for (const row of schedule) {
      if (row.sentAt) continue;
      if (elapsed < row.minDay) continue;
      if (row.day > 0 && hasMedia) continue;

      const mail = buildMediaOwnerOnboardingEmail(row.day, {
        name: p.user.name,
        referralCode: p.referralCode,
      });
      if (!mail) continue;

      try {
        await sendEmail({
          to: p.user.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await db.mediaOwnerProfile.update({
          where: { userId: p.userId },
          data: { [row.field]: new Date() },
        });
        sent += 1;
      } catch (e) {
        console.error("[onboarding] send failed", p.userId, row.day, e);
        skipped += 1;
      }
    }
  }

  return { sent, skipped };
}
