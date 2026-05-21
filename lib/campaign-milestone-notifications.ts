import type { PrismaClient } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { seoulYmd, addSeoulDays } from "@/lib/notifications";
import { sendEmail, isEmailConfigured } from "@/lib/email/client";
import {
  notifyCampaignTomorrow,
  resolveCampaignNotifyPhone,
} from "@/lib/kakao-alimtalk-notify";
import { notifyMediaOwnerCampaignConfirmed } from "@/lib/media-owner-notify";
import { siteUrl } from "@/lib/seo";

type CampaignRow = {
  id: string;
  name: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  ownerUserId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  reportGeneratedAt: Date | null;
  mediaBookings: Array<{
    mediaId: string;
    media: { name: string; ownerUserId: string | null } | null;
  }>;
};

function dayRange(ymd: string): { start: Date; end: Date } {
  return {
    start: new Date(`${ymd}T00:00:00+09:00`),
    end: new Date(`${ymd}T23:59:59.999+09:00`),
  };
}

function ownerIdsFromCampaign(c: CampaignRow): string[] {
  const ids = new Set<string>();
  for (const b of c.mediaBookings) {
    const oid = b.media?.ownerUserId;
    if (oid) ids.add(oid);
  }
  return [...ids];
}

async function notifyAdvertiser(
  c: CampaignRow,
  opts: {
    dedupeKey: string;
    title: string;
    body: string;
    link?: string;
    emailSubject?: string;
    emailHtml?: string;
  },
): Promise<boolean> {
  if (!c.ownerUserId) return false;
  const n = await createNotification({
    userId: c.ownerUserId,
    type: "CAMPAIGN_MILESTONE",
    title: opts.title,
    body: opts.body,
    link: opts.link ?? `/dashboard/campaigns/${c.id}`,
    dedupeKey: opts.dedupeKey,
  });
  if (opts.emailSubject && isEmailConfigured() && c.clientEmail) {
    void sendEmail({
      to: c.clientEmail,
      subject: opts.emailSubject,
      html: opts.emailHtml ?? `<p>${opts.body}</p>`,
      text: opts.body,
    }).catch(() => {});
  }
  return !!n;
}

async function notifyOwners(
  c: CampaignRow,
  ownerUserIds: string[],
  opts: {
    dedupeKey: string;
    title: string;
    body: string;
    link?: string;
  },
): Promise<number> {
  let sent = 0;
  for (const ownerUserId of ownerUserIds) {
    const n = await createNotification({
      userId: ownerUserId,
      type: "CAMPAIGN_MILESTONE",
      title: opts.title,
      body: `${c.name} — ${opts.body}`,
      link: opts.link ?? `/media-owner/campaigns`,
      dedupeKey: `${opts.dedupeKey}:${ownerUserId}`,
    });
    if (n) sent += 1;
  }
  return sent;
}

export async function runCampaignMilestoneNotifications(
  db: PrismaClient,
): Promise<{
  created: number;
  alimtalk: number;
  emails: number;
  milestones: Record<string, number>;
}> {
  const todayYmd = seoulYmd(new Date());
  const counts: Record<string, number> = {};
  let created = 0;
  let alimtalk = 0;
  let emails = 0;

  const activeStatuses = [
    "contract",
    "production",
    "airing",
    "completed",
  ] as const;

  const campaigns = await db.campaign.findMany({
    where: {
      startDate: { not: null },
      status: { in: [...activeStatuses] },
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      ownerUserId: true,
      startDate: true,
      endDate: true,
      status: true,
      reportGeneratedAt: true,
      mediaBookings: {
        where: { status: { in: ["confirmed", "tentative"] } },
        select: {
          mediaId: true,
          media: { select: { name: true, ownerUserId: true } },
        },
      },
    },
  });

  const bump = (key: string, n: number) => {
    counts[key] = (counts[key] ?? 0) + n;
    created += n;
  };

  for (const c of campaigns) {
    if (!c.startDate) continue;
    const startYmd = seoulYmd(c.startDate);
    const endYmd = c.endDate ? seoulYmd(c.endDate) : null;
    const owners = ownerIdsFromCampaign(c as CampaignRow);
    const dash = `/dashboard/campaigns/${c.id}`;
    const creatives = `/creatives?campaign=${c.id}`;

    // D-7: 소재 제출
    if (startYmd === addSeoulDays(todayYmd, 7)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:d7_creative:${c.id}:${startYmd}`,
          title: "집행 7일 전 — 소재 제출",
          body: `「${c.name}」집행 7일 전입니다. 광고 소재를 제출해 주세요.`,
          link: creatives,
          emailSubject: `[THINKAD] 집행 7일 전, 소재 제출 부탁드려요`,
          emailHtml: `<p>안녕하세요 <strong>${c.clientName}</strong>님,</p><p>「${c.name}」캠페인 집행이 7일 남았습니다. 소재를 업로드해 주세요.</p><p><a href="${siteUrl}${creatives}">소재 업로드 →</a></p>`,
        })
      ) {
        bump("d7_creative", 1);
        emails += 1;
      }
    }

    // D-3: 매체사 소재 검수 대기
    if (startYmd === addSeoulDays(todayYmd, 3)) {
      const n = await notifyOwners(c as CampaignRow, owners, {
        dedupeKey: `ms:d3_review:${c.id}:${startYmd}`,
        title: "집행 3일 전 — 소재 검수",
        body: "광고주 소재 검수·확인이 필요합니다.",
        link: "/media-owner/campaigns",
      });
      bump("d3_owner_review", n);
      for (const oid of owners) {
        const booking = c.mediaBookings.find((b) => b.media?.ownerUserId === oid);
        if (booking?.media?.name) {
          void notifyMediaOwnerCampaignConfirmed({
            ownerUserId: oid,
            mediaName: booking.media.name,
            campaignName: `${c.name} (소재 검수 D-3)`,
          }).catch(() => {});
        }
      }
    }

    // D-1: 양측 집행 시작 안내
    if (startYmd === addSeoulDays(todayYmd, 1)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:d1_start_adv:${c.id}:${startYmd}`,
          title: "내일부터 집행 시작",
          body: `「${c.name}」광고가 내일부터 시작됩니다.`,
          link: dash,
          emailSubject: `[THINKAD] 내일부터 집행 시작 — ${c.name}`,
        })
      ) {
        bump("d1_advertiser", 1);
        emails += 1;
      }
      const phone = await resolveCampaignNotifyPhone(c);
      if (phone) {
        const r = await notifyCampaignTomorrow({
          phone,
          name: c.clientName,
          campaignName: c.name,
        });
        if (r.sent) alimtalk += 1;
      }
      const n = await notifyOwners(c as CampaignRow, owners, {
        dedupeKey: `ms:d1_start_owner:${c.id}:${startYmd}`,
        title: "내일부터 집행 시작",
        body: "집행 준비를 확인해 주세요.",
      });
      bump("d1_owner", n);
    }

    // D+1: 인증 사진 업로드 요청 (시작일 = 어제)
    if (startYmd === addSeoulDays(todayYmd, -1)) {
      const n = await notifyOwners(c as CampaignRow, owners, {
        dedupeKey: `ms:d1_proof:${c.id}:${todayYmd}`,
        title: "인증 사진 업로드 요청",
        body: "집행 1일차 — 현장 인증 사진을 업로드해 주세요.",
        link: "/media-owner/campaigns",
      });
      bump("d1_proof", n);
    }

    // D+7: 광고주 1주차 인증 확인
    if (startYmd === addSeoulDays(todayYmd, -7)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:d7_proof_check:${c.id}:${todayYmd}`,
          title: "1주차 인증 사진 확인",
          body: `「${c.name}」1주차 집행 인증 사진을 확인해 보세요.`,
          link: dash,
          emailSubject: `[THINKAD] 1주차 인증 사진 확인 — ${c.name}`,
        })
      ) {
        bump("d7_proof_check", 1);
        emails += 1;
      }
    }

    if (!endYmd) continue;

    // 종료 D-3
    if (endYmd === addSeoulDays(todayYmd, 3)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:end_d3:${c.id}:${endYmd}`,
          title: "캠페인 종료 3일 전",
          body: `「${c.name}」종료까지 3일 남았습니다.`,
          link: dash,
        })
      ) {
        bump("end_d3_adv", 1);
      }
      const n = await notifyOwners(c as CampaignRow, owners, {
        dedupeKey: `ms:end_d3:${c.id}:${endYmd}`,
        title: "캠페인 종료 3일 전",
        body: "종료 일정을 확인해 주세요.",
      });
      bump("end_d3_owner", n);
    }

    // 종료 D+5: 리포트 발송 + 다음 캠페인 제안 (renewal cron과 병행)
    if (endYmd === addSeoulDays(todayYmd, -5)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:end_p5_renewal:${c.id}:${todayYmd}`,
          title: "리포트 발송 · 다음 캠페인 제안",
          body: `「${c.name}」결과를 바탕으로 다음 집행 제안을 확인해 보세요.`,
          link: `/planner?renewFrom=${c.id}`,
          emailSubject: `[THINKAD] 다음 캠페인 제안 — ${c.name}`,
        })
      ) {
        bump("end_p5_renewal", 1);
        emails += 1;
      }
    }

    // 종료 D+1: 리포트 작성 중
    if (endYmd === addSeoulDays(todayYmd, -1)) {
      if (
        await notifyAdvertiser(c as CampaignRow, {
          dedupeKey: `ms:end_p1_report:${c.id}:${todayYmd}`,
          title: "결과 리포트 작성 중",
          body: `「${c.name}」캠페인이 종료되었습니다. 결과 리포트를 준비 중입니다.`,
          link: dash,
          emailSubject: `[THINKAD] 결과 리포트 작성 중 — ${c.name}`,
        })
      ) {
        bump("end_p1_report", 1);
        emails += 1;
      }
    }
  }

  return { created, alimtalk, emails, milestones: counts };
}
