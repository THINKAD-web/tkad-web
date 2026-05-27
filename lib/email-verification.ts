import { prisma } from "@/lib/prisma";
import { sendEmailWithResult, isEmailConfigured } from "@/lib/email/client";
import { getVerifyEmailContent } from "@/lib/email/verify-email";
import { generateSecureToken, hashToken } from "@/lib/secure-token";
import { siteUrl } from "@/lib/seo";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function issueEmailVerification(
  userId: string,
  locale = "ko",
): Promise<{ sent: boolean; error?: string }> {
  const token = generateSecureToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyToken: tokenHash,
      emailVerifyTokenExpiresAt: expiresAt,
    },
    select: { email: true, name: true, locale: true },
  });

  if (!isEmailConfigured()) {
    console.warn("[email-verification] Email not configured; token issued only.");
    return { sent: false };
  }

  const loc = locale || user.locale || "ko";
  const base = siteUrl.replace(/\/$/, "");
  const verifyUrl = `${base}/${loc}/verify-email?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = getVerifyEmailContent({
    name: user.name,
    verifyUrl,
    locale: loc,
  });

  const result = await sendEmailWithResult({ to: user.email, subject, html, text });
  if (!result.sent) {
    console.error("[email-verification] send failed:", result.error);
  }
  return result;
}

export type VerifyEmailResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_OR_EXPIRED" | "ALREADY_VERIFIED" };

export async function verifyEmailByToken(token: string): Promise<VerifyEmailResult> {
  const tokenHash = hashToken(token.trim());
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: tokenHash,
      deletedAt: null,
    },
    select: {
      id: true,
      emailVerifiedAt: true,
      emailVerifyTokenExpiresAt: true,
    },
  });

  if (!user) return { ok: false, reason: "INVALID_OR_EXPIRED" };
  if (user.emailVerifiedAt) return { ok: false, reason: "ALREADY_VERIFIED" };
  if (
    !user.emailVerifyTokenExpiresAt ||
    user.emailVerifyTokenExpiresAt.getTime() < Date.now()
  ) {
    return { ok: false, reason: "INVALID_OR_EXPIRED" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  return { ok: true };
}
