import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { createNotification, seoulYmd, addSeoulDays } from "@/lib/notifications";
import {
  notifyCampaignTomorrow,
  resolveCampaignNotifyPhone,
} from "@/lib/kakao-alimtalk-notify";
import { runCampaignMilestoneNotifications } from "@/lib/campaign-milestone-notifications";
import { runCampaignRenewalProposals } from "@/lib/campaign-renewal-proposal";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** 캠페인 시작·종료 D-1 알림 생성 (매일 1회 cron) */
export async function GET(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!isDatabaseConfigured()) {
    return json({ ok: false, reason: "db_not_configured" }, 200);
  }

  const db = getPrisma();
  const tomorrowYmd = addSeoulDays(seoulYmd(new Date()), 1);

  const startOfTomorrow = new Date(`${tomorrowYmd}T00:00:00+09:00`);
  const endOfTomorrow = new Date(`${tomorrowYmd}T23:59:59.999+09:00`);

  const todayYmd = seoulYmd(new Date());
  const yesterdayYmd = addSeoulDays(todayYmd, -1);
  const startOfYesterday = new Date(`${yesterdayYmd}T00:00:00+09:00`);
  const endOfYesterday = new Date(`${yesterdayYmd}T23:59:59.999+09:00`);

  const campaigns = await db.campaign.findMany({
    where: {
      ownerUserId: { not: null },
      OR: [
        { startDate: { gte: startOfTomorrow, lte: endOfTomorrow } },
        { endDate: { gte: startOfTomorrow, lte: endOfTomorrow } },
        {
          status: "completed",
          endDate: { gte: startOfYesterday, lte: endOfYesterday },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientPhone: true,
      ownerUserId: true,
      startDate: true,
      endDate: true,
      status: true,
      mediaBookings: {
        select: { mediaId: true },
        where: { status: "confirmed" },
      },
    },
  });

  let created = 0;
  let alimtalkSent = 0;
  for (const c of campaigns) {
    const userId = c.ownerUserId;
    if (!userId) continue;

    if (
      c.startDate &&
      c.startDate >= startOfTomorrow &&
      c.startDate <= endOfTomorrow
    ) {
      const n = await createNotification({
        userId,
        type: "CAMPAIGN_START",
        title: "캠페인 시작 D-1",
        body: c.name,
        link: `/dashboard/campaigns/${c.id}`,
        dedupeKey: `campaign_start:${c.id}:${tomorrowYmd}`,
      });
      if (n) created += 1;

      const phone = await resolveCampaignNotifyPhone(c);
      if (phone) {
        const result = await notifyCampaignTomorrow({
          phone,
          name: c.clientName?.trim() || "고객",
          campaignName: c.name,
        });
        if (result.sent) alimtalkSent += 1;
      }
    }

    if (
      c.endDate &&
      c.endDate >= startOfTomorrow &&
      c.endDate <= endOfTomorrow
    ) {
      const n = await createNotification({
        userId,
        type: "CAMPAIGN_END",
        title: "캠페인 종료 D-1",
        body: c.name,
        link: `/dashboard/campaigns/${c.id}`,
        dedupeKey: `campaign_end:${c.id}:${tomorrowYmd}`,
      });
      if (n) created += 1;
    }

    if (
      c.status === "completed" &&
      c.endDate &&
      c.endDate >= startOfYesterday &&
      c.endDate <= endOfYesterday
    ) {
      for (const b of c.mediaBookings) {
        const n = await createNotification({
          userId,
          type: "REVIEW_REQUEST",
          title: "매체 리뷰를 남겨 주세요",
          body: `${c.name} — 집행하신 매체에 대한 후기를 공유해 주세요.`,
          link: `/media/${b.mediaId}/review`,
          dedupeKey: `review_request:${c.id}:${b.mediaId}:${yesterdayYmd}`,
        });
        if (n) created += 1;
      }
    }
  }

  const milestones = await runCampaignMilestoneNotifications(db);
  const renewal = await runCampaignRenewalProposals(db);

  return json({
    ok: true,
    created: created + milestones.created,
    alimtalkSent: alimtalkSent + milestones.alimtalk,
    milestoneEmails: milestones.emails,
    milestones: milestones.milestones,
    renewalGenerated: renewal.generated,
    renewalEmailed: renewal.emailed,
    reportsIssued: milestones.reportsIssued,
    checked: campaigns.length,
    date: tomorrowYmd,
    reviewWindow: yesterdayYmd,
  });
}
