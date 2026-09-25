import type { MapMapItem } from "@/components/media-map/media-map-types";
import { mediaPublicSlug } from "@/lib/media-slug";

/** `media=` 쿼리 값 — 공개 slug 우선 (상세 URL과 동일 규칙) */
export function mapItemToUrlMediaRef(item: Pick<MapMapItem, "id" | "slug">): string {
  return mediaPublicSlug(item);
}

export function mapItemMatchesUrlMediaRef(
  item: Pick<MapMapItem, "id" | "slug">,
  ref: string,
): boolean {
  const t = ref.trim();
  if (!t) return false;
  if (item.id === t) return true;
  const slug = item.slug?.trim();
  return Boolean(slug && slug === t);
}
