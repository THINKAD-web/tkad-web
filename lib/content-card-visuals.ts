/** Quiet-professional neutrals — no violet/cyan neon ramps */
export const CATEGORY_GRADIENTS: Record<string, string> = {
  TREND: "from-zinc-600 to-zinc-900",
  GUIDE: "from-stone-600 to-stone-900",
  REGION: "from-slate-600 to-slate-900",
  CAMPAIGN: "from-neutral-600 to-neutral-900",
  패션: "from-stone-500 to-stone-800",
  "F&B": "from-orange-800 to-zinc-900",
  엔터: "from-zinc-600 to-zinc-900",
  "IT/앱": "from-slate-600 to-slate-900",
  뷰티: "from-stone-600 to-stone-900",
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
