import type { PrismaClient } from "@prisma/client";
import { reviewCreativeAsset } from "@/lib/creative-ai-review";
import { createNotification } from "@/lib/notifications";
import { notifyMediaOwnerCampaignConfirmed } from "@/lib/media-owner-notify";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";

export async function submitCampaignCreative(
  db: PrismaClient,
  input: {
    campaignId: string;
    creativeId: string;
    userId: string;
    mediaId?: string | null;
    locale?: string;
  },
): Promise<{
  submissionId: string;
  status: string;
  passed: boolean;
  feedback: string;
}> {
  const campaign = await db.campaign.findFirst({
    where: {
      id: input.campaignId,
      ownerUserId: input.userId,
    },
    select: {
      id: true,
      name: true,
      clientEmail: true,
      clientName: true,
      mediaBookings: {
        where: { status: "confirmed" },
        select: {
          mediaId: true,
          media: { select: { id: true, name: true, ownerUserId: true } },
        },
      },
    },
  });
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

  const creative = await db.creative.findFirst({
    where: {
      id: input.creativeId,
      userId: input.userId,
      deletedAt: null,
    },
  });
  if (!creative) throw new Error("CREATIVE_NOT_FOUND");

  const mediaId =
    input.mediaId ??
    campaign.mediaBookings[0]?.mediaId ??
    null;

  await db.campaignCreativeSubmission.upsert({
    where: {
      campaignId_creativeId: {
        campaignId: input.campaignId,
        creativeId: input.creativeId,
      },
    },
    create: {
      campaignId: input.campaignId,
      creativeId: input.creativeId,
      submittedByUserId: input.userId,
      mediaId,
      status: "AI_REVIEWING",
    },
    update: {
      mediaId,
      status: "AI_REVIEWING",
      aiFeedback: null,
      forwardedAt: null,
    },
  });

  const ai = await reviewCreativeAsset({
    type: creative.type,
    url: creative.url,
    name: creative.name,
    width: creative.width,
    height: creative.height,
    fileSize: creative.fileSize,
  });

  const isKo = input.locale !== "en";
  const feedback = isKo ? ai.feedbackKo : ai.feedbackEn;

  if (ai.passed) {
    const row = await db.campaignCreativeSubmission.update({
      where: {
        campaignId_creativeId: {
          campaignId: input.campaignId,
          creativeId: input.creativeId,
        },
      },
      data: {
        status: "FORWARDED_TO_OWNER",
        aiResult: { checks: ai.checks, overallScore: ai.overallScore },
        aiFeedback: feedback,
        forwardedAt: new Date(),
      },
    });

    const booking = campaign.mediaBookings.find(
      (b) => b.mediaId === (mediaId ?? b.mediaId),
    );
    const ownerId = booking?.media?.ownerUserId;
    if (ownerId && booking?.media?.name) {
      await createNotification({
        userId: ownerId,
        type: "CREATIVE_REVIEW",
        title: "광고 소재 도착 (AI 검수 통과)",
        body: `${campaign.name} — ${booking.media.name}`,
        link: "/media-owner/campaigns",
        dedupeKey: `creative_fwd:${row.id}`,
      });
      void notifyMediaOwnerCampaignConfirmed({
        ownerUserId: ownerId,
        mediaName: booking.media.name,
        campaignName: `${campaign.name} (소재 전달)`,
      }).catch(() => {});
    }

    await createNotification({
      userId: input.userId,
      type: "CREATIVE_REVIEW",
      title: "소재 검수 통과",
      body: `「${campaign.name}」소재가 매체사에 전달되었습니다.`,
      link: `/dashboard/campaigns/${campaign.id}`,
      dedupeKey: `creative_pass:${row.id}`,
    });

    return {
      submissionId: row.id,
      status: row.status,
      passed: true,
      feedback,
    };
  }

  const row = await db.campaignCreativeSubmission.update({
    where: {
      campaignId_creativeId: {
        campaignId: input.campaignId,
        creativeId: input.creativeId,
      },
    },
    data: {
      status: "AI_FAILED",
      aiResult: { checks: ai.checks, overallScore: ai.overallScore },
      aiFeedback: feedback,
    },
  });

  await createNotification({
    userId: input.userId,
    type: "CREATIVE_REVIEW",
    title: "소재 재제출 필요",
    body: feedback,
    link: `/creatives?campaign=${campaign.id}`,
    dedupeKey: `creative_fail:${row.id}`,
  });

  if (isEmailConfigured() && campaign.clientEmail) {
    void sendEmail({
      to: campaign.clientEmail,
      subject: `[THINKAD] 소재 재제출 안내 — ${campaign.name}`,
      html: `<p>${feedback}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://thinkad.co.kr"}/ko/creatives">소재 다시 업로드</a></p>`,
      text: feedback,
    }).catch(() => {});
  }

  return {
    submissionId: row.id,
    status: row.status,
    passed: false,
    feedback,
  };
}
