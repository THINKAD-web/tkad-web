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

export const runtime = "nodejs";

const Body = z.object({
  mediaIds: z.array(z.string().min(1).max(64)).max(200),
});

/**
 * POST /api/my/favorites/sync
 *
 * 비로그인 상태에서 localStorage 에 쌓인 찜 매체 ID 목록을 로그인 직후 DB 로 이관.
 * 멱등: 이미 등록된 mediaId 는 무시. 응답으로 현재 사용자의 전체 mediaId 목록 반환.
 */
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

    const dedupedIds = Array.from(
      new Set(parsed.data.mediaIds.map((s) => s.trim()).filter(Boolean)),
    );

    if (dedupedIds.length === 0) {
      const existing = await prisma.userFavoriteMedia.findMany({
        where: { userId: user.id },
        select: { mediaId: true },
      });
      return apiOk({
        added: 0,
        skipped: 0,
        ids: existing.map((f) => f.mediaId),
      });
    }

    // 한꺼번에 createMany + skipDuplicates 로 처리.
    const result = await prisma.userFavoriteMedia.createMany({
      data: dedupedIds.map((mediaId) => ({ userId: user.id, mediaId })),
      skipDuplicates: true,
    });

    const all = await prisma.userFavoriteMedia.findMany({
      where: { userId: user.id },
      select: { mediaId: true },
    });

    return apiOk({
      added: result.count,
      skipped: dedupedIds.length - result.count,
      ids: all.map((f) => f.mediaId),
    });
  } catch (e) {
    return apiServerError(e, "my/favorites/sync");
  }
}
