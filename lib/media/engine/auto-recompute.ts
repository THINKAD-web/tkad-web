import type { PrismaClient } from "@prisma/client";
import { recomputeOneMedia } from "./recompute-one";

type Db = PrismaClient;

/**
 * bulk-import / admin save 후 v1 재계산.
 * 저장 실패를 막지 않도록 오류는 로그만 남긴다.
 */
export async function maybeAutoRecomputeMediaMetrics(
  db: Db,
  mediaId: string,
): Promise<void> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: { dailyFootfall: true },
  });
  if ((media?.dailyFootfall ?? 0) <= 0) return;

  try {
    await recomputeOneMedia(db, mediaId);
  } catch (err) {
    console.error("[media-engine] auto-recompute failed", { mediaId, err });
  }
}
