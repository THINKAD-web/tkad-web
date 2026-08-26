import { unstable_cache } from "next/cache";
import { computeDailyEngagementScores } from "@/lib/media-popularity";
import { logMediaCacheMiss } from "@/lib/media-cache-diagnostics";

/** browse `/media` 일간 인기 — 1h cross-request cache (catalog·trust badge와 동일 cadence) */
export const DAILY_POPULARITY_REVALIDATE_SECONDS = 3600;
export const MEDIA_DAILY_ENGAGEMENT_CACHE_TAG = "media-daily-engagement-scores";

async function loadDailyEngagementScoreRecord(): Promise<Record<string, number>> {
  logMediaCacheMiss("daily-engagement-scores");
  const scores = await computeDailyEngagementScores();
  return Object.fromEntries(scores);
}

const readCachedDailyEngagementScoreRecord = unstable_cache(
  loadDailyEngagementScoreRecord,
  ["media-daily-engagement-scores-v2"],
  {
    revalidate: DAILY_POPULARITY_REVALIDATE_SECONDS,
    tags: [MEDIA_DAILY_ENGAGEMENT_CACHE_TAG],
  },
);

export async function getCachedDailyEngagementScoreRecord(): Promise<
  Record<string, number>
> {
  return readCachedDailyEngagementScoreRecord();
}

export async function getDailyEngagementScoreForMedia(
  mediaId: string,
): Promise<number> {
  const record = await readCachedDailyEngagementScoreRecord();
  return record[mediaId] ?? 0;
}
