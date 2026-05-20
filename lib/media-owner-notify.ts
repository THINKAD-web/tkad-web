import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  normalizeKrPhone,
  sendAlimtalk,
  type SendAlimtalkResult,
} from "@/lib/kakao-alimtalk";

async function resolveOwnerNotifyPhone(
  ownerUserId: string,
  fallbackPhone?: string | null,
): Promise<string | null> {
  if (fallbackPhone?.trim()) {
    const n = normalizeKrPhone(fallbackPhone);
    if (n) return n;
  }
  if (!isDatabaseConfigured()) return null;
  const user = await getPrisma().user.findUnique({
    where: { id: ownerUserId },
    select: { phone: true, name: true },
  });
  if (user?.phone?.trim()) {
    return normalizeKrPhone(user.phone);
  }
  return null;
}

export async function notifyMediaOwnerNewInquiry(input: {
  ownerUserId: string;
  mediaName: string;
  contactPhone?: string | null;
}): Promise<SendAlimtalkResult> {
  const phone = await resolveOwnerNotifyPhone(
    input.ownerUserId,
    input.contactPhone,
  );
  if (!phone) {
    return { sent: false, channel: "noop", detail: "no owner phone" };
  }
  return sendAlimtalk({
    to: phone,
    templateCode: "TKAD_OWNER_NEW_INQUIRY",
    variables: {
      mediaName: input.mediaName,
      link: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thinkad.co.kr"}/ko/media-owner/dashboard`,
    },
  });
}

export async function notifyMediaOwnerCampaignConfirmed(input: {
  ownerUserId: string;
  mediaName: string;
  campaignName: string;
}): Promise<SendAlimtalkResult> {
  const phone = await resolveOwnerNotifyPhone(input.ownerUserId);
  if (!phone) {
    return { sent: false, channel: "noop", detail: "no owner phone" };
  }
  return sendAlimtalk({
    to: phone,
    templateCode: "TKAD_OWNER_CAMPAIGN_CONFIRMED",
    variables: {
      mediaName: input.mediaName,
      campaignName: input.campaignName,
    },
  });
}

export async function notifyMediaOwnerSettlementCompleted(input: {
  ownerUserId: string;
  periodMonth: string;
  netWon: number;
}): Promise<SendAlimtalkResult> {
  const phone = await resolveOwnerNotifyPhone(input.ownerUserId);
  if (!phone) {
    return { sent: false, channel: "noop", detail: "no owner phone" };
  }
  const amount = input.netWon.toLocaleString("ko-KR");
  return sendAlimtalk({
    to: phone,
    templateCode: "TKAD_OWNER_SETTLEMENT_DONE",
    variables: {
      periodMonth: input.periodMonth,
      amount,
    },
  });
}
