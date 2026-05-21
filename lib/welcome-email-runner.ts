import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  buildAdvertiserWelcomeEmail,
  type WelcomeDay,
} from "@/lib/email/welcome-advertiser-sequence";

const MS_DAY = 24 * 60 * 60 * 1000;

function daysSince(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / MS_DAY);
}

const SCHEDULE: {
  day: WelcomeDay;
  minDay: number;
  field: "day0SentAt" | "day1SentAt" | "day3SentAt" | "day7SentAt" | "day14SentAt";
  roles: Array<"advertiser" | "agency" | "admin">;
}[] = [
  { day: 0, minDay: 0, field: "day0SentAt", roles: ["advertiser", "agency", "admin"] },
  { day: 1, minDay: 1, field: "day1SentAt", roles: ["advertiser", "agency"] },
  { day: 3, minDay: 3, field: "day3SentAt", roles: ["advertiser", "agency"] },
  { day: 7, minDay: 7, field: "day7SentAt", roles: ["advertiser", "agency"] },
  { day: 14, minDay: 14, field: "day14SentAt", roles: ["advertiser", "agency"] },
];

/** 광고주·대행사 가입 환영 드립 */
export async function runAdvertiserWelcomeDrip(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!isDatabaseConfigured() || !isEmailConfigured()) {
    return { sent: 0, skipped: 0 };
  }

  const db = getPrisma();
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      role: { in: ["advertiser", "agency"] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      role: true,
      createdAt: true,
      proTrialEndsAt: true,
      welcomeDrip: true,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  let sent = 0;
  let skipped = 0;

  for (const u of users) {
    const elapsed = daysSince(u.createdAt);
    const locale = u.locale === "en" ? "en" : "ko";

    for (const row of SCHEDULE) {
      if (!row.roles.includes(u.role as "advertiser" | "agency" | "admin")) continue;
      if (elapsed < row.minDay) continue;

      const drip = u.welcomeDrip;
      if (drip?.[row.field]) continue;

      if (row.day === 14) {
        if (!u.proTrialEndsAt) continue;
        const msLeft = u.proTrialEndsAt.getTime() - Date.now();
        if (msLeft > 4 * MS_DAY || msLeft < 0) continue;
      }

      const mail = buildAdvertiserWelcomeEmail(row.day, {
        name: u.name,
        locale,
      });
      if (!mail) continue;

      try {
        await sendEmail({
          to: u.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await db.userWelcomeDrip.upsert({
          where: { userId: u.id },
          create: { userId: u.id, [row.field]: new Date() },
          update: { [row.field]: new Date() },
        });
        sent += 1;
      } catch (e) {
        console.error("[welcome-drip]", u.id, row.day, e);
        skipped += 1;
      }
    }
  }

  return { sent, skipped };
}
