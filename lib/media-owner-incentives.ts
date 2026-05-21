import type { ApiKeyPlan } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import { buildMediaOwnerOnboardingEmail } from "@/lib/email/media-owner-onboarding";

const PRO_DAYS = 30;

function referralCodeFromUserId(userId: string): string {
  return `M${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function ensureMediaOwnerProfile(
  userId: string,
  referredByCode?: string | null,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();

  const existing = await db.mediaOwnerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (existing) return;

  let referredByUserId: string | null = null;
  if (referredByCode?.trim()) {
    const ref = await db.mediaOwnerProfile.findUnique({
      where: { referralCode: referredByCode.trim().toUpperCase() },
      select: { userId: true },
    });
    referredByUserId = ref?.userId ?? null;
  }

  const proFreeUntil = new Date(Date.now() + PRO_DAYS * 24 * 60 * 60 * 1000);

  await db.mediaOwnerProfile.create({
    data: {
      userId,
      referralCode: referralCodeFromUserId(userId),
      referredByUserId,
      proFreeUntil,
      lifetimePro: false,
      approvedMediaCount: 0,
    },
  });

  await applyOwnerProPlan(userId, proFreeUntil, false);

  const profile = await db.mediaOwnerProfile.findUnique({
    where: { userId },
    select: { referralCode: true },
  });
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (u && isEmailConfigured()) {
    const mail = buildMediaOwnerOnboardingEmail(0, {
      name: u.name,
      referralCode: profile?.referralCode,
    });
    if (mail) {
      try {
        await sendEmail({
          to: u.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        await db.mediaOwnerProfile.update({
          where: { userId },
          data: { emailDay0SentAt: new Date() },
        });
      } catch (e) {
        console.error("[media-owner] day0 email", e);
      }
    }
  }
}

async function applyOwnerProPlan(
  userId: string,
  proFreeUntil: Date | null,
  lifetimePro: boolean,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const active =
    lifetimePro || (proFreeUntil != null && proFreeUntil.getTime() > Date.now());
  if (!active) return;

  const plan: ApiKeyPlan = "PRO";
  const db = getPrisma();
  await db.apiKey.updateMany({
    where: { userId, isActive: true },
    data: { plan },
  });
}

export async function grantReferrerProMonth(referrerUserId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();
  const until = new Date(Date.now() + PRO_DAYS * 24 * 60 * 60 * 1000);
  const profile = await db.mediaOwnerProfile.findUnique({
    where: { userId: referrerUserId },
  });
  if (!profile) return;

  const current = profile.proFreeUntil?.getTime() ?? 0;
  const nextUntil = new Date(Math.max(current, until.getTime()));

  await db.mediaOwnerProfile.update({
    where: { userId: referrerUserId },
    data: { proFreeUntil: nextUntil },
  });
  await applyOwnerProPlan(referrerUserId, nextUntil, profile.lifetimePro);
}

export async function onMediaApplicationApproved(opts: {
  ownerUserId: string | null;
  contactEmail: string;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getPrisma();

  let userId = opts.ownerUserId;
  if (!userId && opts.contactEmail) {
    const u = await db.user.findFirst({
      where: { email: opts.contactEmail.trim().toLowerCase(), deletedAt: null },
      select: { id: true, role: true },
    });
    if (u && (u.role === "owner" || u.role === "admin")) userId = u.id;
  }
  if (!userId) return;

  await ensureMediaOwnerProfile(userId);

  const count = await db.media.count({
    where: { ownerUserId: userId, isActive: true },
  });

  const profile = await db.mediaOwnerProfile.findUnique({
    where: { userId },
  });
  if (!profile) return;

  const lifetime = count >= 5;
  await db.mediaOwnerProfile.update({
    where: { userId },
    data: {
      approvedMediaCount: count,
      ...(lifetime && !profile.lifetimePro
        ? { lifetimePro: true, proFreeUntil: null }
        : {}),
    },
  });

  if (lifetime) {
    await applyOwnerProPlan(userId, null, true);
  } else if (profile.proFreeUntil) {
    await applyOwnerProPlan(userId, profile.proFreeUntil, false);
  }

  if (profile.referredByUserId) {
    const refProfile = await db.mediaOwnerProfile.findUnique({
      where: { userId: profile.referredByUserId },
    });
    if (refProfile && count === 1) {
      await grantReferrerProMonth(profile.referredByUserId);
    }
  }
}

export function parseReferralCodeFromSearch(
  search: string,
): string | null {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const ref = new URLSearchParams(q).get("ref")?.trim();
  return ref || null;
}
