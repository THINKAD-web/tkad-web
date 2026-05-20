import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import {
  apiError,
  apiOk,
  apiServerError,
  apiZodError,
  readJson,
} from "@/lib/api-response";
import { recordConversion } from "@/lib/tracking/record";

export const runtime = "nodejs";

const Body = z.object({
  mediaId: z.string().min(1).max(64),
  action: z.enum(["add", "remove", "toggle"]).default("toggle"),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError("UNAUTHORIZED", 401, {
        message: "로그인이 필요합니다.",
      });
    }

    const body = await readJson(req);
    if (!body) return apiError("INVALID_JSON", 400);

    const parsed = Body.safeParse(body);
    if (!parsed.success) return apiZodError(parsed.error);

    const { mediaId, action } = parsed.data;
    const existing = await prisma.userFavoriteMedia.findUnique({
      where: { userId_mediaId: { userId: user.id, mediaId } },
    });

    let favorited: boolean;
    if (action === "add" || (action === "toggle" && !existing)) {
      if (!existing) {
        await prisma.userFavoriteMedia.create({
          data: { userId: user.id, mediaId },
        });
      }
      favorited = true;
      void recordConversion({
        type: "favorite",
        mediaId,
        userId: user.id,
      });
    } else {
      if (existing) {
        await prisma.userFavoriteMedia.delete({
          where: { userId_mediaId: { userId: user.id, mediaId } },
        });
      }
      favorited = false;
    }

    return apiOk({ mediaId, favorited });
  } catch (e) {
    return apiServerError(e, "my/favorite");
  }
}
