import webpush from "web-push";
import { getPrisma } from "@/lib/prisma";

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "mailto:support@thinkad.co.kr";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return getVapidKeys() != null;
}

export function getVapidPublicKey(): string | null {
  return getVapidKeys()?.publicKey ?? null;
}

function ensureWebPushConfigured() {
  const keys = getVapidKeys();
  if (!keys) {
    throw new Error("VAPID keys not configured");
  }
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return keys;
}

export async function sendWebPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: WebPushPayload,
): Promise<boolean> {
  if (!isWebPushConfigured()) return false;
  ensureWebPushConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      const db = getPrisma();
      await db.pushSubscription.deleteMany({
        where: { endpoint: subscription.endpoint },
      });
    }
    console.error("[web-push] send failed", subscription.endpoint, e);
    return false;
  }
}

export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload,
): Promise<number> {
  if (!isWebPushConfigured()) return 0;
  const db = getPrisma();
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    const ok = await sendWebPushToSubscription(sub, payload);
    if (ok) sent += 1;
  }
  return sent;
}

export async function sendWebPushToUsers(
  userIds: string[],
  payload: WebPushPayload,
): Promise<number> {
  let total = 0;
  for (const uid of [...new Set(userIds)]) {
    total += await sendWebPushToUser(uid, payload);
  }
  return total;
}

function pushBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "https://thinkad.co.kr";
  return base.replace(/\/$/, "");
}

/** 견적서 발송 — 로그인 사용자 Web Push */
export async function pushNotifyQuoteArrived(
  userId: string,
  input: { quoteId: string; locale?: string },
): Promise<number> {
  const locale = input.locale === "en" ? "en" : "ko";
  return sendWebPushToUser(userId, {
    title: "견적서가 도착했어요",
    body: "견적서를 확인해 주세요.",
    url: `${pushBaseUrl()}/${locale}/quote/${input.quoteId}/preview`,
    tag: `quote_arrived:${input.quoteId}`,
  });
}

/** 캠페인 집행 D-1 */
export async function pushNotifyCampaignD1(
  userId: string,
  input: { campaignId: string; campaignName: string },
): Promise<number> {
  return sendWebPushToUser(userId, {
    title: "내일부터 광고가 집행됩니다",
    body: input.campaignName,
    url: `${pushBaseUrl()}/ko/dashboard/campaigns/${input.campaignId}`,
    tag: `campaign_d1:${input.campaignId}`,
  });
}

/** 찜한 매체 예약 가능 */
export async function pushNotifyFavoriteMediaAvailable(
  userId: string,
  input: { mediaId: string; mediaName: string },
): Promise<number> {
  return sendWebPushToUser(userId, {
    title: "찜한 매체 예약 가능",
    body: `${input.mediaName} — 예약 가능`,
    url: `${pushBaseUrl()}/ko/media/${input.mediaId}`,
    tag: `media_avail:${input.mediaId}`,
  });
}
