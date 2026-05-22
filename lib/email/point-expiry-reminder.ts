import { prisma } from "@/lib/prisma";
import { isDatabaseConfigured } from "@/lib/prisma";

/** 포인트 만료 D-30 이메일 (없으면 스킵) */
export async function sendPointExpiryReminderEmail(opts: {
  userId: string;
  points: number;
  expiresAt: Date;
}): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    select: { email: true, name: true, locale: true },
  });
  if (!user?.email) return false;

  const { sendEmail } = await import("@/lib/email/client");
  const locale = user.locale === "en" ? "en" : "ko";
  const dateStr = opts.expiresAt.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US");
  const subject =
    locale === "ko"
      ? `[THINKAD] ${opts.points.toLocaleString()}P가 곧 만료됩니다`
      : `[THINKAD] ${opts.points.toLocaleString()} points expiring soon`;

  const html =
    locale === "ko"
      ? `<p>${user.name}님, 적립하신 <strong>${opts.points.toLocaleString()}P</strong>가 ${dateStr}에 만료 예정입니다.</p><p><a href="https://tkad.co.kr/ko/points">포인트 샵에서 교환하기</a></p>`
      : `<p>Hi ${user.name}, <strong>${opts.points.toLocaleString()} points</strong> will expire on ${dateStr}.</p><p><a href="https://tkad.co.kr/en/points">Redeem in Points Shop</a></p>`;

  await sendEmail({ to: user.email, subject, html });
  return true;
}
