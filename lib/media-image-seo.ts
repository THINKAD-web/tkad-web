import { typeLabels, type MediaItem } from "@/lib/media-data";
import { marketingTypeLabel } from "@/lib/marketing-media-types";

/**
 * 매체 이미지 alt: "{매체명} — {지역} {유형} 옥외광고"
 */
export function buildMediaImageAlt(
  media: Pick<
    MediaItem,
    "name" | "nameEn" | "location" | "locationEn" | "district" | "city" | "region" | "type" | "subCategory"
  >,
  locale: string,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko");
  const name = isKo ? media.name : media.nameEn || media.name;
  const region =
    media.district?.trim() ||
    media.city?.trim() ||
    media.region?.trim() ||
    (isKo ? media.location : media.locationEn || media.location) ||
    (isKo ? "서울" : "Seoul");
  const marketing = marketingTypeLabel(media, locale);
  const catalogType = typeLabels[media.type];
  const typePart =
    marketing ||
    (catalogType ? (isKo ? catalogType.ko : catalogType.en) : media.type);
  const suffix = isKo ? "옥외광고" : "OOH advertising";
  return `${name} — ${region} ${typePart} ${suffix}`.replace(/\s+/g, " ").trim();
}
