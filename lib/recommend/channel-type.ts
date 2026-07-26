/** UI-only channel axis for recommend form (not consumed by mix/AI engine yet). */
export type RecommendChannelType = "ooh" | "digital" | "integrated";

export const RECOMMEND_CHANNEL_TYPES = [
  "ooh",
  "digital",
  "integrated",
] as const satisfies readonly RecommendChannelType[];

export const RECOMMEND_CHANNEL_TYPE_STORAGE_KEY = "tkad_recommend_channel_type";

export function parseRecommendChannelType(
  raw: string | null | undefined,
): RecommendChannelType | null {
  if (raw === "ooh" || raw === "digital" || raw === "integrated") return raw;
  return null;
}

export function readStoredRecommendChannelType(
  fallback: RecommendChannelType = "ooh",
): RecommendChannelType {
  if (typeof window === "undefined") return fallback;
  try {
    return (
      parseRecommendChannelType(
        window.sessionStorage.getItem(RECOMMEND_CHANNEL_TYPE_STORAGE_KEY),
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}

export function writeStoredRecommendChannelType(
  value: RecommendChannelType,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RECOMMEND_CHANNEL_TYPE_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
