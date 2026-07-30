import { unstable_cache } from "next/cache";
import { computeDailyEngagementScores } from "@/lib/media-popularity";

/** browse `/media` 일간 인기 — 10분 캐시 (온디맨드 24h 집계) */
export const DAILY_POPULARITY_REVALIDATE_SECONDS = 600;

async function loadDailyEngagementScoreRecord(): Promise<Record<string, number>> {
  const scores = await computeDailyEngagementScores();
  return Object.fromEntries(scores);
}

const readCachedDailyEngagementScoreRecord = unstable_cache(
  loadDailyEngagementScoreRecord,
  ["media-daily-engagement-scores"],
  { revalidate: DAILY_POPULARITY_REVALIDATE_SECONDS },
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
