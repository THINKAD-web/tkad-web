import type { MediaItem } from "@/lib/media-data";
import { isMediaCuid } from "@/lib/slug";
import { parseNetworkRawId } from "@/lib/media-network-types";

export { isMediaCuid };

export type MediaLinkRef =
  | string
  | Pick<MediaItem, "id" | "slug">
  | { id: string; slug?: string | null };

/** Canonical public path segment for a media item (slug preferred). */
export function mediaPublicSlug(ref: MediaLinkRef): string {
  if (typeof ref === "string") return ref;
  const slug = ref.slug?.trim();
  if (slug) return slug;
  return ref.id;
}

/** `/media/[slug-or-id]` — network packages unchanged. */
export function mediaItemDetailPath(ref: MediaLinkRef): string {
  if (typeof ref === "string") {
    const raw = parseNetworkRawId(ref);
    if (raw) return `/media/network/${raw}`;
    return `/media/${ref}`;
  }
  const raw = parseNetworkRawId(ref.id);
  if (raw) return `/media/network/${raw}`;
  return `/media/${mediaPublicSlug(ref)}`;
}

/** True when URL param is legacy cuid and canonical slug exists. */
export function shouldRedirectMediaIdToSlug(
  param: string,
  media: Pick<MediaItem, "id" | "slug">,
): boolean {
  if (!isMediaCuid(param)) return false;
  if (param !== media.id) return false;
  const slug = media.slug?.trim();
  return Boolean(slug && slug !== media.id);
}
