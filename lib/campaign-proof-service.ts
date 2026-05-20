import { randomBytes } from "crypto";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  parseCloudinaryPublicId,
  uploadWatermarkedCopy,
} from "@/lib/campaign-proof-cloudinary";
import { notifyAdvertiserProofPhotoUploaded } from "@/lib/kakao-alimtalk-notify";

export type CreateProofPhotoInput = {
  campaignId: string;
  imageUrl: string;
  caption?: string | null;
  mediaName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: Date | null;
  uploadSource: "admin" | "mobile" | "qr" | "media_owner" | string;
  uploadedByUserId?: string | null;
};

export async function getCampaignMediaNames(
  campaignId: string,
): Promise<string[]> {
  const db = getPrisma();
  const bookings = await db.mediaBooking.findMany({
    where: { campaignId },
    include: { media: { select: { name: true } } },
    take: 20,
  });
  return [
    ...new Set(
      bookings.map((b) => b.media?.name).filter((n): n is string => !!n),
    ),
  ];
}

export async function incrementProofUploadTokenUsage(token: string) {
  const db = getPrisma();
  await db.campaignProofUploadToken.updateMany({
    where: { token },
    data: { usageCount: { increment: 1 } },
  });
}

export async function createCampaignProofPhoto(
  input: CreateProofPhotoInput & { proofToken?: string | null },
) {
  const db = getPrisma();
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { id: true, name: true },
  });
  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const capturedAt = input.capturedAt ?? new Date();
  const publicId = parseCloudinaryPublicId(input.imageUrl);
  let imageUrlWatermarked: string | null = null;
  if (publicId) {
    imageUrlWatermarked = await uploadWatermarkedCopy({
      publicId,
      capturedAt,
    });
  }

  const mediaNames = await getCampaignMediaNames(input.campaignId);
  const mediaName =
    input.mediaName?.trim() ||
    mediaNames[0] ||
    null;

  const tagParts = [
    mediaName,
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "short",
      timeStyle: "short",
    }).format(capturedAt),
  ].filter(Boolean);

  const caption =
    input.caption?.trim() ||
    tagParts.join(" · ") ||
    null;

  const photo = await db.campaignProofPhoto.create({
    data: {
      campaignId: input.campaignId,
      imageUrl: input.imageUrl,
      imageUrlWatermarked,
      caption,
      mediaName,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      capturedAt,
      uploadSource: input.uploadSource,
      uploadedByUserId: input.uploadedByUserId ?? null,
    },
  });

  if (input.proofToken) {
    void incrementProofUploadTokenUsage(input.proofToken).catch((e) =>
      console.error("[proof] token usage", e),
    );
  }

  void notifyAdvertiserProofPhotoUploaded({
    campaignId: input.campaignId,
  }).catch((e) => console.error("[proof] alimtalk", e));

  return photo;
}

export function generateProofUploadTokenValue(): string {
  return randomBytes(24).toString("base64url");
}

export async function getOrCreateProofUploadToken(campaignId: string) {
  const db = getPrisma();
  const existing = await db.campaignProofUploadToken.findFirst({
    where: {
      campaignId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return db.campaignProofUploadToken.create({
    data: {
      campaignId,
      token: generateProofUploadTokenValue(),
      label: "현장 QR",
    },
  });
}

export async function resolveCampaignByProofToken(token: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  const row = await db.campaignProofUploadToken.findUnique({
    where: { token },
    include: { campaign: { select: { id: true, name: true } } },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  return row;
}

export function publicProofUploadPath(locale: string, token: string): string {
  return `/${locale}/proof-upload/${token}`;
}

export function advertiserProofTabUrl(
  locale: string,
  campaignId: string,
): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://thinkad.co.kr";
  return `${base.replace(/\/$/, "")}/${locale}/dashboard/campaigns/${campaignId}?tab=proof`;
}
