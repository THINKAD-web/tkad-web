import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import {
  normalizeKrPhone,
  sendAlimtalk,
  type SendAlimtalkResult,
} from "@/lib/kakao-alimtalk";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    siteUrl
  ).replace(/\/$/, "");
}

export async function resolveCampaignNotifyPhone(campaign: {
  clientPhone?: string | null;
  ownerUserId?: string | null;
}): Promise<string | null> {
  if (campaign.clientPhone?.trim()) {
    const n = normalizeKrPhone(campaign.clientPhone);
    if (n) return n;
  }
  if (!campaign.ownerUserId || !isDatabaseConfigured()) return null;
  const user = await getPrisma().user.findUnique({
    where: { id: campaign.ownerUserId },
    select: { phone: true },
  });
  if (user?.phone?.trim()) {
    return normalizeKrPhone(user.phone);
  }
  return null;
}

export async function notifyInquiryReceived(input: {
  phone: string;
  name: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_INQUIRY_RECEIVED",
    recvName: input.name,
    variables: { name: input.name },
  });
}

export async function notifyQuoteExpiringSoon(input: {
  phone: string;
  name: string;
  link: string;
  validUntil: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_QUOTE_EXPIRING",
    recvName: input.name,
    variables: {
      name: input.name,
      link: input.link,
      validUntil: input.validUntil,
    },
  });
}

export async function notifyQuoteSent(input: {
  phone: string;
  name: string;
  quoteNumber?: string;
  quoteId?: string;
  link?: string;
}): Promise<SendAlimtalkResult> {
  const link =
    input.link ??
    (input.quoteId
      ? `${baseUrl()}/ko/quote/${input.quoteId}`
      : `${baseUrl()}/ko/my`);
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_QUOTE_SENT",
    recvName: input.name,
    variables: {
      name: input.name,
      link,
      quoteNumber: input.quoteNumber ?? "",
    },
  });
}

export async function notifyCampaignConfirmed(input: {
  phone: string;
  name: string;
  campaignName: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_CAMPAIGN_CONFIRMED",
    recvName: input.name,
    variables: {
      name: input.name,
      campaignName: input.campaignName,
    },
  });
}

export async function notifyCampaignTomorrow(input: {
  phone: string;
  name: string;
  campaignName: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_CAMPAIGN_TOMORROW",
    recvName: input.name,
    variables: {
      name: input.name,
      campaignName: input.campaignName,
    },
  });
}

export async function notifyReportReady(input: {
  phone: string;
  name: string;
  campaignName: string;
  campaignId: string;
}): Promise<SendAlimtalkResult> {
  return sendAlimtalk({
    to: input.phone,
    templateCode: "TKAD_REPORT_READY",
    recvName: input.name,
    variables: {
      name: input.name,
      campaignName: input.campaignName,
      link: `${baseUrl()}/ko/dashboard/campaigns/${input.campaignId}`,
    },
  });
}

/** 캠페인 ID로 수신자·본문 변수 해석 후 알림톡 */
export async function notifyCampaignByTemplate(
  campaignId: string,
  templateCode:
    | "TKAD_CAMPAIGN_CONFIRMED"
    | "TKAD_CAMPAIGN_TOMORROW"
    | "TKAD_REPORT_READY",
): Promise<SendAlimtalkResult> {
  if (!isDatabaseConfigured()) {
    return { sent: false, channel: "noop", error: "db_not_configured" };
  }
  const c = await getPrisma().campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientPhone: true,
      ownerUserId: true,
    },
  });
  if (!c) return { sent: false, channel: "noop", error: "campaign_not_found" };

  const phone = await resolveCampaignNotifyPhone(c);
  if (!phone) return { sent: false, channel: "noop", error: "no_phone" };

  const name = c.clientName?.trim() || "고객";
  const payload = {
    phone,
    name,
    campaignName: c.name,
    campaignId: c.id,
  };

  switch (templateCode) {
    case "TKAD_CAMPAIGN_CONFIRMED":
      return notifyCampaignConfirmed(payload);
    case "TKAD_CAMPAIGN_TOMORROW":
      return notifyCampaignTomorrow(payload);
    case "TKAD_REPORT_READY":
      return notifyReportReady(payload);
    default:
      return { sent: false, channel: "noop", error: "unknown_template" };
  }
}
