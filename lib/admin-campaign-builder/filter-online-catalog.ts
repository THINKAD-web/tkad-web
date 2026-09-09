import type { PublicMediaView } from "@/lib/digital/public-media-types";

export type OnlineCatalogFilters = {
  q?: string;
  mediaType?: string;
};

export function filterOnlineCatalog(
  views: PublicMediaView[],
  filters: OnlineCatalogFilters,
): PublicMediaView[] {
  const q = filters.q?.trim().toLowerCase() ?? "";
  const mediaType = filters.mediaType?.trim() || undefined;

  return views.filter((m) => {
    if (mediaType && m.mediaType !== mediaType) return false;
    if (!q) return true;
    const hay = [
      m.nameKo,
      m.nameEn,
      m.descriptionKo,
      m.descriptionEn,
      m.platform ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
