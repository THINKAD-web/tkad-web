import type { MediaItem } from "@/lib/media-data";
import {
  fetchHomeFeaturedMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
} from "@/lib/public-media-catalog";

export type HomeMediaFetchType = "recommended" | "popular" | "newest";

export async function fetchHomeMediaForScroll(
  fetchType: HomeMediaFetchType,
  limit = 10,
): Promise<MediaItem[]> {
  switch (fetchType) {
    case "recommended":
      return fetchHomeFeaturedMedia(limit);
    case "popular":
      return fetchHomeWeeklyPopularMedia(limit);
    case "newest":
      return fetchHomeNewMedia(limit);
    default:
      return [];
  }
}
