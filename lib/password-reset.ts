import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { getPasswordResetEmailContent } from "@/lib/email/password-reset";
import { hashPassword } from "@/lib/password";
import { generateSecureToken, hashToken } from "@/lib/secure-token";
import { siteUrl } from "@/lib/seo";

const RESET_TTL_MS = 60 * 60 * 1000;

/** 항상 성공 응답용 — 이메일 열거 방지 */
export async function requestPasswordReset(
  email: string,
  locale = "ko",
): Promise<{ processed: true }> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      passwordHash: true,
      email: true,
      name: true,
      locale: true,
    },
  });

  if (!user?.passwordHash) {
    return { processed: true };
  }

  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt,
    },
  });

  if (!isEmailConfigured()) {
    console.warn("[password-reset] Email not configured.");
    return { processed: true };
  }

  const loc = locale || user.locale || "ko";
  const base = siteUrl.replace(/\/$/, "");
  const resetUrl = `${base}/${loc}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = getPasswordResetEmailContent({
    name: user.name,
    resetUrl,
    locale: loc,
  });

  await sendEmail({ to: user.email, subject, html, text });
  return { processed: true };
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_OR_EXPIRED" };

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const tokenHash = hashToken(token.trim());
  const row = await prisma.passwordResetToken.findFirst({
    where: {
      token: tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: { select: { id: true, deletedAt: true } },
    },
  });

  if (!row || row.user.deletedAt) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.delete({ where: { id: row.id } }),
  ]);

  return { ok: true };
}
