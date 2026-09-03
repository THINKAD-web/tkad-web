/** Static slug metadata from PR3 seed — lossless dmpilot channel/mediaType/sortOrder. */

export type OnlineSlugMeta = {
  mediaType: string;
  channel: string;
  objective: string;
  sortOrder: number;
};

/** 23 published online slugs — keyed lookup for adapter (PR5-c). */
export const ONLINE_SLUG_META: Record<string, OnlineSlugMeta> = {
  "ig-awareness-reach": {
    mediaType: "SNS",
    channel: "INSTAGRAM",
    objective: "AWARENESS",
    sortOrder: 10,
  },
  "ig-lead-gen": {
    mediaType: "SNS",
    channel: "INSTAGRAM",
    objective: "LEAD",
    sortOrder: 11,
  },
  "ig-conversion-shop": {
    mediaType: "SNS",
    channel: "INSTAGRAM",
    objective: "CONVERSION",
    sortOrder: 12,
  },
  "fb-traffic": {
    mediaType: "SNS",
    channel: "FACEBOOK",
    objective: "TRAFFIC",
    sortOrder: 20,
  },
  "fb-awareness": {
    mediaType: "SNS",
    channel: "FACEBOOK",
    objective: "AWARENESS",
    sortOrder: 21,
  },
  "yt-awareness": {
    mediaType: "VIDEO",
    channel: "YOUTUBE",
    objective: "AWARENESS",
    sortOrder: 30,
  },
  "kakao-traffic": {
    mediaType: "SNS",
    channel: "KAKAO",
    objective: "TRAFFIC",
    sortOrder: 40,
  },
  "naver-sa-brand": {
    mediaType: "SA",
    channel: "NAVER_SA",
    objective: "AWARENESS",
    sortOrder: 50,
  },
  "naver-sa-conversion": {
    mediaType: "SA",
    channel: "NAVER_SA",
    objective: "CONVERSION",
    sortOrder: 51,
  },
  "naver-sa-traffic": {
    mediaType: "SA",
    channel: "NAVER_SA",
    objective: "TRAFFIC",
    sortOrder: 52,
  },
  "google-ads-search": {
    mediaType: "SA",
    channel: "GOOGLE_ADS",
    objective: "CONVERSION",
    sortOrder: 60,
  },
  "google-ads-awareness": {
    mediaType: "DA",
    channel: "GOOGLE_ADS",
    objective: "AWARENESS",
    sortOrder: 61,
  },
  "google-ads-lead": {
    mediaType: "SA",
    channel: "GOOGLE_ADS",
    objective: "LEAD",
    sortOrder: 62,
  },
  "meta-advantage-plus": {
    mediaType: "SNS",
    channel: "INSTAGRAM",
    objective: "CONVERSION",
    sortOrder: 13,
  },
  "naver-gfa-traffic": {
    mediaType: "DA",
    channel: "NAVER_SA",
    objective: "TRAFFIC",
    sortOrder: 53,
  },
  "kakao-moment-message": {
    mediaType: "MESSAGE",
    channel: "KAKAO",
    objective: "CONVERSION",
    sortOrder: 41,
  },
  "youtube-action": {
    mediaType: "VIDEO",
    channel: "YOUTUBE",
    objective: "CONVERSION",
    sortOrder: 31,
  },
  "google-pmax-conversion": {
    mediaType: "DA",
    channel: "GOOGLE_ADS",
    objective: "CONVERSION",
    sortOrder: 63,
  },
  "karrot-local-traffic": {
    mediaType: "RETAIL",
    channel: "FACEBOOK",
    objective: "TRAFFIC",
    sortOrder: 70,
  },
  "baemin-ad-visit": {
    mediaType: "RETAIL",
    channel: "KAKAO",
    objective: "CONVERSION",
    sortOrder: 71,
  },
  "tiktok-spark-awareness": {
    mediaType: "VERTICAL",
    channel: "INSTAGRAM",
    objective: "AWARENESS",
    sortOrder: 14,
  },
  "app-uai-install": {
    mediaType: "SNS",
    channel: "FACEBOOK",
    objective: "CONVERSION",
    sortOrder: 22,
  },
  "native-taboola-traffic": {
    mediaType: "NATIVE",
    channel: "GOOGLE_ADS",
    objective: "TRAFFIC",
    sortOrder: 64,
  },
};

export function lookupOnlineSlugMeta(slug: string): OnlineSlugMeta | null {
  return ONLINE_SLUG_META[slug] ?? null;
}
