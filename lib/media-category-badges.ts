import {
  categoryLabel,
  getMediaCategoryBySlug,
  getTargetCategoryBySlug,
  targetLabel,
} from "@/lib/media-categories";
import type { MediaItem } from "@/lib/media-data";

export function formatMediaCategoryBadges(
  media: MediaItem,
  locale: string,
  max = 2,
): { icon: string; label: string }[] {
  const isKo = locale.startsWith("ko");
  const out: { icon: string; label: string }[] = [];
  for (const slug of media.mediaCategory ?? []) {
    const node = getMediaCategoryBySlug(slug);
    if (!node) continue;
    if (node.parentId) {
      out.push({
        icon: node.icon ?? "📍",
        label: categoryLabel(slug, locale),
      });
    }
  }
  for (const slug of media.targetCategory ?? []) {
    const node = getTargetCategoryBySlug(slug);
    if (node) {
      out.push({
        icon: node.icon ?? "📢",
        label: isKo ? `${targetLabel(slug, locale)} 추천` : targetLabel(slug, locale),
      });
    }
  }
  return out.slice(0, max);
}
