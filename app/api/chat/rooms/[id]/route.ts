import { apiError, apiOk, apiServerError } from "@/lib/api-response";
import {
  ownerSlaDueAt,
  resolveChatParticipantSide,
} from "@/lib/chat-room-service";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import type { MediaItem } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);
    if (!isDatabaseConfigured()) return apiError("DB_UNAVAILABLE", 503);

    const { id } = await params;
    const db = getPrisma();
    const room = await db.chatRoom.findUnique({
      where: { id },
      include: {
        media: {
          select: {
            id: true,
            name: true,
            nameEn: true,
            location: true,
            type: true,
            price: true,
            pricePeriod: true,
            image: true,
            width: true,
            height: true,
          },
        },
        oohQuote: { select: { id: true, status: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
          select: {
            id: true,
            senderRole: true,
            displayLabel: true,
            bodySanitized: true,
            contactBlocked: true,
            attachmentUrl: true,
            attachmentType: true,
            attachmentName: true,
            isAutoReply: true,
            quoteId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!room) return apiError("NOT_FOUND", 404);

    const isAdmin = user.role === "admin";
    const side = resolveChatParticipantSide(room, user.id, isAdmin);
    if (!side) return apiError("FORBIDDEN", 403);

    const locale = room.locale === "en" ? "en" : "ko";
    const isKo = locale === "ko";
    const mediaStub = {
      id: room.media.id,
      name: room.media.name,
      nameEn: room.media.nameEn ?? room.media.name,
      location: room.media.location,
      locationEn: room.media.location,
      region: "",
      type: room.media.type,
      price: room.media.price,
      lat: 0,
      lng: 0,
      dailyFootTraffic: 0,
      sampleImages: room.media.image ? [room.media.image] : [],
    } as MediaItem;

    return apiOk({
      room: {
        id: room.id,
        status: room.status,
        side,
        locale,
        ownerReplied: !!room.ownerFirstReplyAt,
        slaDueAt: ownerSlaDueAt(room)?.toISOString() ?? null,
        quoteId: room.oohQuote?.id ?? null,
        quoteStatus: room.oohQuote?.status ?? null,
        previewUrl: room.oohQuote?.id
          ? `/${locale}/quote/${room.oohQuote.id}/preview`
          : null,
        contractUrl: room.oohQuote?.id
          ? `/${locale}/quote/${room.oohQuote.id}/contract`
          : null,
        media: {
          id: room.media.id,
          name: isKo ? room.media.name : room.media.nameEn || room.media.name,
          location: room.media.location,
          type: room.media.type,
          price: room.media.price,
          pricePeriod: room.media.pricePeriod,
          image: getPrimaryMediaImageUrl(mediaStub),
          width: room.media.width,
          height: room.media.height,
        },
      },
      messages: room.messages.map((m) => ({
        id: m.id,
        senderRole: m.senderRole,
        displayLabel: m.displayLabel,
        body: m.bodySanitized,
        contactBlocked: m.contactBlocked,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        attachmentName: m.attachmentName,
        isAutoReply: m.isAutoReply,
        quoteId: m.quoteId,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiServerError(e, "chat/rooms/[id] GET");
  }
}
