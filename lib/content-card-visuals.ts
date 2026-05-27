export const CATEGORY_GRADIENTS: Record<string, string> = {
  TREND: "from-violet-600 to-purple-800",
  GUIDE: "from-cyan-600 to-teal-800",
  REGION: "from-blue-600 to-indigo-800",
  CAMPAIGN: "from-pink-600 to-rose-800",
  패션: "from-pink-500 to-rose-700",
  "F&B": "from-orange-500 to-amber-700",
  엔터: "from-purple-500 to-violet-700",
  "IT/앱": "from-blue-500 to-cyan-700",
  뷰티: "from-rose-500 to-pink-700",
  DEFAULT: "from-gray-600 to-gray-800",
};

export function isPlaceholderThumbnail(url?: string | null): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return true;
  return /opengraph-image/i.test(trimmed);
}

export function resolveContentGradientKey(
  category?: string | null,
  industry?: string | null,
): string {
  const cat = category?.trim();
  if (cat && CATEGORY_GRADIENTS[cat]) return cat;
  const ind = industry?.trim();
  if (ind && CATEGORY_GRADIENTS[ind]) return ind;
  return "DEFAULT";
}

export function contentGradientClass(
  category?: string | null,
  industry?: string | null,
): string {
  const key = resolveContentGradientKey(category, industry);
  return CATEGORY_GRADIENTS[key] ?? CATEGORY_GRADIENTS.DEFAULT;
}

export function contentCategoryEmoji(
  category?: string | null,
  industry?: string | null,
): string {
  const cat = category?.trim();
  if (cat === "TREND") return "📈";
  if (cat === "GUIDE") return "📚";
  if (cat === "REGION") return "📍";
  if (cat === "CAMPAIGN") return "🎯";

  const ind = industry?.trim();
  if (ind === "패션") return "👗";
  if (ind === "F&B") return "🍽";
  if (ind === "엔터") return "🎤";
  if (ind === "IT/앱") return "💻";
  if (ind === "뷰티") return "💄";

  return industry ? "🏆" : "📊";
}

export function cleanSummary(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/\[|\]/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/`/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/>\s?/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 카드용 읽기 시간 추정 (분) */
export function estimateReadMinutes(...parts: Array<string | undefined | null>): number {
  const text = parts.filter(Boolean).join(" ");
  const chars = text.replace(/\s+/g, "").length;
  if (chars <= 0) return 5;
  return Math.max(3, Math.min(12, Math.round(chars / 320) || 5));
}
