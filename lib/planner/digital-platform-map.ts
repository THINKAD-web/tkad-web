import type { DigitalChannelId } from "@/lib/planner/digital-channels";
import type { DigitalCatalogItem } from "@/lib/planner/digital-catalog-types";

function platformLower(item: DigitalCatalogItem): string {
  return (item.platform ?? "").toLowerCase();
}

/**
 * Map a published Digital product to integrated planner platform bucket.
 * Order matters: TikTok/Karrot/Buzzvil before generic Meta/Facebook.
 */
export function matchCatalogItemToPlatformId(
  item: DigitalCatalogItem,
): DigitalChannelId | null {
  const platform = platformLower(item);

  if (platform.includes("tiktok")) return "tiktok";
  if (platform.includes("karrot") || platform.includes("당근")) return "daangn";
  if (platform.includes("buzzvil")) return "buzzvil";

  if (item.mediaType === "REWARD") {
    return "buzzvil";
  }

  switch (item.channel) {
    case "NAVER_SA":
      return "naver";
    case "KAKAO":
      return "kakao";
    case "GOOGLE_ADS":
    case "YOUTUBE":
      return "google";
    case "INSTAGRAM":
    case "FACEBOOK":
      return "meta";
    default:
      return null;
  }
}

export const DIGITAL_PLATFORM_IDS: DigitalChannelId[] = [
  "naver",
  "kakao",
  "google",
  "meta",
  "daangn",
  "buzzvil",
  "tiktok",
];
