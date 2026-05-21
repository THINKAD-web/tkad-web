import {
  ChatRoomStatus,
  ChatSenderRole,
  type ChatRoom,
  type PrismaClient,
} from "@prisma/client";
import { filterChatContactInfo } from "@/lib/chat-contact-filter";
import {
  CHAT_LABEL_ADVERTISER,
  CHAT_LABEL_OWNER,
  CHAT_LABEL_SYSTEM,
  OWNER_AWAY_MESSAGE,
  OWNER_SLA_HOURS,
} from "@/lib/chat-constants";
import { generateChatAiOwnerReply } from "@/lib/chat-ai-reply";
import { createNotification } from "@/lib/notifications";
import { notifyMediaOwnerNewInquiry } from "@/lib/media-owner-notify";
import { postInternalAlert } from "@/lib/internal-webhook";

export type ChatParticipantSide = "advertiser" | "owner" | "admin";

export function resolveChatParticipantSide(
  room: Pick<ChatRoom, "advertiserUserId" | "ownerUserId">,
  userId: string,
  isAdmin?: boolean,
): ChatParticipantSide | null {
  if (isAdmin) return "admin";
  if (room.advertiserUserId === userId) return "advertiser";
  if (room.ownerUserId === userId) return "owner";
  return null;
}

function displayLabelForRole(role: ChatSenderRole): string {
  switch (role) {
    case "advertiser":
      return CHAT_LABEL_ADVERTISER;
    case "owner":
      return CHAT_LABEL_OWNER;
    case "system":
      return CHAT_LABEL_SYSTEM;
    default:
      return CHAT_LABEL_SYSTEM;
  }
}

export async function createOrGetChatRoom(
  db: PrismaClient,
  input: { mediaId: string; advertiserUserId: string; locale: string },
): Promise<{ roomId: string; created: boolean }> {
  const media = await db.media.findFirst({
    where: { id: input.mediaId, isActive: true },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
    },
  });
  if (!media?.ownerUserId) {
    throw new Error("MEDIA_NO_OWNER");
  }
  if (media.ownerUserId === input.advertiserUserId) {
    throw new Error("SELF_CHAT");
  }

  const existing = await db.chatRoom.findUnique({
    where: {
      mediaId_advertiserUserId: {
        mediaId: input.mediaId,
        advertiserUserId: input.advertiserUserId,
      },
    },
    select: { id: true },
  });
  if (existing) return { roomId: existing.id, created: false };

  const room = await db.chatRoom.create({
    data: {
      mediaId: input.mediaId,
      advertiserUserId: input.advertiserUserId,
      ownerUserId: media.ownerUserId,
      locale: input.locale === "en" ? "en" : "ko",
      status: ChatRoomStatus.OPEN,
    },
  });

  const isKo = input.locale !== "en";
  await db.chatMessage.create({
    data: {
      roomId: room.id,
      senderRole: ChatSenderRole.system,
      displayLabel: CHAT_LABEL_SYSTEM,
      body: isKo
        ? `「${media.name}」매체 문의 채팅이 시작되었습니다. 연락처(전화·이메일) 교환은 차단됩니다. 매체사 운영자는 24시간 내 응답을 권장합니다.`
        : `Chat started for "${media.name}". Contact details are blocked. The media operator is expected to reply within 24 hours.`,
      bodySanitized: isKo
        ? `「${media.name}」매체 문의 채팅이 시작되었습니다.`
        : `Chat started for "${media.name}".`,
    },
  });

  const now = new Date();
  await db.chatRoom.update({
    where: { id: room.id },
    data: { ownerNotifiedAt: now, lastMessageAt: now },
  });

  void createNotification({
    userId: media.ownerUserId,
    type: "CHAT_MESSAGE",
    title: isKo ? "새 매체 문의 채팅" : "New media chat",
    body: isKo
      ? `${media.name} — 광고주가 문의했습니다. 24시간 내 응답해 주세요.`
      : `${media.name} — advertiser started a chat. Please reply within 24 hours.`,
    link: `/${input.locale === "en" ? "en" : "ko"}/chat/${room.id}`,
    dedupeKey: `chat_room_open:${room.id}`,
  }).catch(() => {});

  void notifyMediaOwnerNewInquiry({
    ownerUserId: media.ownerUserId,
    mediaName: media.name,
  }).catch(() => {});

  void postInternalAlert({
    type: "inquiry",
    title: "익명 채팅 개설",
    body: media.name,
    meta: { roomId: room.id, mediaId: media.id },
  }).catch(() => {});

  return { roomId: room.id, created: true };
}

export async function sendChatMessage(
  db: PrismaClient,
  input: {
    roomId: string;
    senderUserId: string;
    senderRole: ChatSenderRole;
    body: string;
    attachmentUrl?: string | null;
    attachmentType?: string | null;
    attachmentName?: string | null;
    quoteId?: string | null;
    skipAutoReply?: boolean;
  },
): Promise<{ messageId: string; contactBlocked: boolean }> {
  const trimmed = input.body.trim();
  if (!trimmed && !input.attachmentUrl) {
    throw new Error("EMPTY_MESSAGE");
  }

  const filtered = filterChatContactInfo(trimmed);
  const role =
    input.senderRole === ChatSenderRole.owner ||
    input.senderRole === ChatSenderRole.advertiser
      ? input.senderRole
      : ChatSenderRole.advertiser;

  const msg = await db.chatMessage.create({
    data: {
      roomId: input.roomId,
      senderRole: role,
      senderUserId: input.senderUserId,
      displayLabel: displayLabelForRole(role),
      body: trimmed || "(첨부파일)",
      bodySanitized: filtered.sanitized || "(첨부파일)",
      contactBlocked: filtered.blocked,
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentType: input.attachmentType ?? null,
      attachmentName: input.attachmentName ?? null,
      quoteId: input.quoteId ?? null,
    },
  });

  const now = new Date();
  const roomUpdate: {
    lastMessageAt: Date;
    ownerFirstReplyAt?: Date;
  } = { lastMessageAt: now };

  if (role === ChatSenderRole.owner) {
    const room = await db.chatRoom.findUnique({
      where: { id: input.roomId },
      select: { ownerFirstReplyAt: true },
    });
    if (!room?.ownerFirstReplyAt) {
      roomUpdate.ownerFirstReplyAt = now;
    }
  }

  await db.chatRoom.update({
    where: { id: input.roomId },
    data: roomUpdate,
  });

  const room = await db.chatRoom.findUnique({
    where: { id: input.roomId },
    include: {
      media: {
        select: {
          id: true,
          name: true,
          location: true,
          type: true,
          price: true,
          width: true,
          height: true,
        },
      },
    },
  });
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const locale = room.locale === "en" ? "en" : "ko";
  const link = `/${locale}/chat/${room.id}`;
  const notifyUserId =
    role === ChatSenderRole.advertiser ? room.ownerUserId : room.advertiserUserId;
  const isKo = locale === "ko";

  void createNotification({
    userId: notifyUserId,
    type: "CHAT_MESSAGE",
    title: isKo ? "새 채팅 메시지" : "New chat message",
    body: filtered.blocked
      ? isKo
        ? `${room.media.name} — 연락처가 차단된 메시지가 도착했습니다.`
        : `${room.media.name} — message with blocked contact info`
      : isKo
        ? `${room.media.name} — ${filtered.sanitized.slice(0, 80)}`
        : `${room.media.name} — ${filtered.sanitized.slice(0, 80)}`,
    link,
    dedupeKey: `chat_msg:${msg.id}`,
  }).catch(() => {});

  if (
    !input.skipAutoReply &&
    role === ChatSenderRole.advertiser &&
    !room.ownerFirstReplyAt
  ) {
    await maybePostOwnerAwayReplies(db, room, trimmed || filtered.sanitized);
  }

  return { messageId: msg.id, contactBlocked: filtered.blocked };
}

async function maybePostOwnerAwayReplies(
  db: PrismaClient,
  room: ChatRoom & {
    media: {
      id: string;
      name: string;
      location: string;
      type: string;
      price: number;
      width: string | null;
      height: string | null;
    };
  },
  advertiserMessage: string,
): Promise<void> {
  const recentSystem = await db.chatMessage.count({
    where: {
      roomId: room.id,
      isAutoReply: true,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recentSystem >= 2) return;

  const locale = room.locale === "en" ? "en" : "ko";
  const isKo = locale === "ko";

  await db.chatMessage.create({
    data: {
      roomId: room.id,
      senderRole: ChatSenderRole.system,
      displayLabel: CHAT_LABEL_SYSTEM,
      body: isKo ? OWNER_AWAY_MESSAGE : OWNER_AWAY_MESSAGE,
      bodySanitized: OWNER_AWAY_MESSAGE,
      isAutoReply: true,
    },
  });

  const aiText = await generateChatAiOwnerReply({
    mediaName: room.media.name,
    location: room.media.location,
    type: room.media.type,
    price: room.media.price,
    width: room.media.width,
    height: room.media.height,
    advertiserMessage,
    locale,
  });

  if (aiText) {
    await db.chatMessage.create({
      data: {
        roomId: room.id,
        senderRole: ChatSenderRole.owner,
        displayLabel: CHAT_LABEL_OWNER,
        body: aiText,
        bodySanitized: aiText,
        isAutoReply: true,
      },
    });
  }

  await db.chatRoom.update({
    where: { id: room.id },
    data: { lastMessageAt: new Date() },
  });
}

export async function listChatRoomsForUser(
  db: PrismaClient,
  userId: string,
  side: "advertiser" | "owner",
) {
  const where =
    side === "advertiser"
      ? { advertiserUserId: userId }
      : { ownerUserId: userId };

  return db.chatRoom.findMany({
    where,
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    take: 50,
    include: {
      media: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          location: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          bodySanitized: true,
          displayLabel: true,
          createdAt: true,
          senderRole: true,
        },
      },
      oohQuote: { select: { id: true, status: true } },
    },
  });
}

export function ownerSlaDueAt(room: {
  createdAt: Date;
  ownerFirstReplyAt: Date | null;
}): Date | null {
  if (room.ownerFirstReplyAt) return null;
  const due = new Date(room.createdAt);
  due.setHours(due.getHours() + OWNER_SLA_HOURS);
  return due;
}
