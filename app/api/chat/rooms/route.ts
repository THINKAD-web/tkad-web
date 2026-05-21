import { z } from "zod";
import { apiError, apiOk, apiServerError, apiZodError } from "@/lib/api-response";
import { createOrGetChatRoom, listChatRoomsForUser } from "@/lib/chat-room-service";
import { ownerSlaDueAt } from "@/lib/chat-room-service";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import type { MediaItem } from "@/lib/media-data";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { isMediaOwnerPortalRole } from "@/lib/media-owner-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  mediaId: z.string().min(1),
  locale: z.enum(["ko", "en"]).optional(),
});

function mapRoom(
  row: Awaited<ReturnType<typeof listChatRoomsForUser>>[number],
  locale: string,
) {
  const isKo = locale !== "en";
  const last = row.messages[0];
  const mediaStub = {
    id: row.media.id,
    name: row.media.name,
    nameEn: row.media.nameEn ?? row.media.name,
    location: row.media.location,
    locationEn: row.media.location,
    region: "",
    type: "",
    price: 0,
    lat: 0,
    lng: 0,
    dailyFootTraffic: 0,
    sampleImages: row.media.image ? [row.media.image] : [],
  } as MediaItem;
  return {
    id: row.id,
    mediaId: row.media.id,
    mediaName: isKo ? row.media.name : row.media.nameEn || row.media.name,
    mediaLocation: row.media.location,
    mediaImage: getPrimaryMediaImageUrl(mediaStub),
    status: row.status,
    lastMessage: last?.bodySanitized ?? null,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? row.createdAt.toISOString(),
    ownerReplied: !!row.ownerFirstReplyAt,
    slaDueAt: ownerSlaDueAt(row)?.toISOString() ?? null,
    quoteId: row.oohQuote?.id ?? null,
    quoteStatus: row.oohQuote?.status ?? null,
  };
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);
    if (!isDatabaseConfigured()) return apiOk({ items: [] });

    const url = new URL(req.url);
    const side = url.searchParams.get("side");
    const locale = user.locale === "en" ? "en" : "ko";
    const db = getPrisma();

    if (side === "owner" && isMediaOwnerPortalRole(user.role)) {
      const rows = await listChatRoomsForUser(db, user.id, "owner");
      return apiOk({ items: rows.map((r) => mapRoom(r, locale)) });
    }

    const rows = await listChatRoomsForUser(db, user.id, "advertiser");
    return apiOk({ items: rows.map((r) => mapRoom(r, locale)) });
  } catch (e) {
    return apiServerError(e, "chat/rooms GET");
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiError("UNAUTHORIZED", 401);
    if (!isDatabaseConfigured()) {
      return apiError("DB_UNAVAILABLE", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("INVALID_JSON", 400);
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const locale =
      parsed.data.locale ?? (user.locale === "en" ? "en" : "ko");

    const db = getPrisma();
    try {
      const { roomId, created } = await createOrGetChatRoom(db, {
        mediaId: parsed.data.mediaId,
        advertiserUserId: user.id,
        locale,
      });
      return apiOk({ roomId, created, href: `/${locale}/chat/${roomId}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "MEDIA_NO_OWNER") {
        return apiError("MEDIA_NO_OWNER", 400, {
          message: "이 매체는 아직 운영자가 연결되지 않았습니다.",
        });
      }
      if (msg === "SELF_CHAT") {
        return apiError("SELF_CHAT", 400, {
          message: "본인 매체에는 문의할 수 없습니다.",
        });
      }
      throw err;
    }
  } catch (e) {
    return apiServerError(e, "chat/rooms POST");
  }
}
