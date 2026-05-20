import type { MediaAvailability, NotificationType } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  isWebPushConfigured,
  pushNotifyCampaignD1,
  pushNotifyFavoriteMediaAvailable,
  pushNotifyQuoteArrived,
  sendWebPushToUser,
} from "@/lib/web-push";
import { siteUrl } from "@/lib/seo";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  dedupeKey?: string | null;
};

function rowToDto(row: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationDto | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getPrisma();
  try {
    if (input.dedupeKey) {
      const row = await db.notification.upsert({
        where: {
          userId_dedupeKey: {
            userId: input.userId,
            dedupeKey: input.dedupeKey,
          },
        },
        create: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link ?? null,
          dedupeKey: input.dedupeKey,
        },
        update: {
          title: input.title,
          body: input.body,
          link: input.link ?? null,
          isRead: false,
        },
      });
      void mirrorNotificationToWebPush(input);
      return rowToDto(row);
    }
    const row = await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
      },
    });
    void mirrorNotificationToWebPush(input);
    return rowToDto(row);
  } catch (e) {
    console.error("[createNotification]", e);
    return null;
  }
}

function mirrorNotificationToWebPush(input: CreateNotificationInput): void {
  if (!isWebPushConfigured()) return;

  if (input.type === "QUOTE_RECEIVED" && input.dedupeKey?.startsWith("quote_sent:")) {
    const quoteId = input.dedupeKey.replace("quote_sent:", "");
    const locale = input.link?.includes("/en/") ? "en" : "ko";
    void pushNotifyQuoteArrived(input.userId, { quoteId, locale });
    return;
  }
  if (input.type === "CAMPAIGN_START" && input.dedupeKey?.startsWith("campaign_start:")) {
    const campaignId = input.dedupeKey.split(":")[1] ?? "";
    if (campaignId) {
      void pushNotifyCampaignD1(input.userId, {
        campaignId,
        campaignName: input.body,
      });
    }
    return;
  }
  if (input.type === "MEDIA_AVAILABLE" && input.dedupeKey?.startsWith("media_avail:")) {
    const mediaId = input.dedupeKey.split(":")[1] ?? "";
    if (mediaId) {
      const mediaName = input.body.split(" — ")[0] ?? input.body;
      void pushNotifyFavoriteMediaAvailable(input.userId, { mediaId, mediaName });
    }
    return;
  }

  const base = siteUrl.replace(/\/$/, "");
  const path = input.link?.startsWith("/") ? input.link : input.link ? `/${input.link}` : "";
  const url = path ? `${base}/ko${path}` : `${base}/ko/my`;
  void sendWebPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    url,
    tag: input.dedupeKey ?? input.type,
  });
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!email.trim() || !isDatabaseConfigured()) return null;
  const db = getPrisma();
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return null;
  return user.id;
}

export async function notifyUserByEmail(
  email: string,
  input: Omit<CreateNotificationInput, "userId">,
): Promise<NotificationDto | null> {
  const userId = await findUserIdByEmail(email);
  if (!userId) return null;
  return createNotification({ ...input, userId });
}

export async function listNotificationsForUser(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number },
): Promise<{ items: NotificationDto[]; unreadCount: number }> {
  const db = getPrisma();
  const where = {
    userId,
    ...(options?.unreadOnly ? { isRead: false } : {}),
  };
  const limit = options?.limit ?? 50;
  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { items: rows.map(rowToDto), unreadCount };
}

const AVAILABILITY_LABEL_KO: Record<MediaAvailability, string> = {
  available: "예약 가능",
  reserved: "예약됨",
  maintenance: "점검 중",
};

export async function notifyFavoriteUsersMediaAvailability(
  mediaId: string,
  mediaName: string,
  previous: MediaAvailability,
  next: MediaAvailability,
): Promise<number> {
  if (previous === next || next !== "available") return 0;
  if (!isDatabaseConfigured()) return 0;
  const db = getPrisma();
  const favs = await db.userFavoriteMedia.findMany({
    where: { mediaId },
    select: { userId: true },
  });
  let sent = 0;
  for (const { userId } of favs) {
    const n = await createNotification({
      userId,
      type: "MEDIA_AVAILABLE",
      title: "찜한 매체 예약 가능",
      body: `${mediaName} — ${AVAILABILITY_LABEL_KO[next]}`,
      link: `/media/${mediaId}`,
      dedupeKey: `media_avail:${mediaId}:${next}`,
    });
    if (n) sent += 1;
  }
  return sent;
}

/** Asia/Seoul 기준 YYYY-MM-DD */
export function seoulYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export function addSeoulDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}
