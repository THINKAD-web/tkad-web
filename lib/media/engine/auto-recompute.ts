import type { PrismaClient } from "@prisma/client";
import { recomputeOneMedia } from "./recompute-one";

type Db = PrismaClient;

/**
 * impressions 가 이미 있으면 incidental save 로 덮어쓰지 않는다.
 */
export function shouldAutoRecomputeMediaMetrics(media: {
  dailyFootfall: number | null;
  impressions: number | null;
}): boolean {
  if ((media.dailyFootfall ?? 0) <= 0) return false;
  return media.impressions == null || media.impressions <= 0;
}

/**
 * bulk-import / admin save 후 v1 재계산 (누락 건만).
 * 저장 실패를 막지 않도록 오류는 로그만 남긴다.
 */
export async function maybeAutoRecomputeMediaMetrics(
  db: Db,
  mediaId: string,
): Promise<void> {
  const media = await db.media.findUnique({
    where: { id: mediaId },
    select: {
      dailyFootfall: true,
      impressions: true,
    },
  });
  if (!media || !shouldAutoRecomputeMediaMetrics(media)) return;

  try {
    await recomputeOneMedia(db, mediaId);
  } catch (err) {
    console.error("[media-engine] auto-recompute failed", { mediaId, err });
  }
}
