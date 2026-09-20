import type { MediaItem } from "@/lib/media-data";
import { resolveMediaDisplayPill } from "@/lib/media-display-labels";
import {
  normalizeMediaDetailTextLocale,
  resolveMediaDisplayName,
  resolveMediaField,
} from "@/lib/media-i18n";
import { marketingTypeLabel } from "@/lib/marketing-media-types";

function mediaTextSource(
  media: Pick<
    MediaItem,
    | "name"
    | "nameEn"
    | "location"
    | "locationEn"
    | "description"
    | "descriptionEn"
    | "translations"
  >,
) {
  return {
    name: media.name,
    nameEn: media.nameEn,
    location: media.location,
    locationEn: media.locationEn,
    description: media.description,
    descriptionEn: media.descriptionEn,
    translations: media.translations,
  };
}

function koreanUi(locale: string): boolean {
  return normalizeMediaDetailTextLocale(locale) === "ko";
}

/**
 * 매체 이미지 alt: "{매체명} — {지역} {유형} 옥외광고"
 */
export function buildMediaImageAlt(
  media: Pick<
    MediaItem,
    "name" | "nameEn" | "location" | "locationEn" | "description" | "descriptionEn" | "translations" | "district" | "city" | "region" | "type" | "subCategory" | "catalogChannel" | "mediaMainCategory" | "mediaSubCategory" | "catalogSource"
  >,
  locale: string,
): string {
  const koUi = koreanUi(locale);
  const pillLocale = normalizeMediaDetailTextLocale(locale);
  const name = resolveMediaDisplayName(mediaTextSource(media), locale);
  const region =
    media.district?.trim() ||
    media.city?.trim() ||
    media.region?.trim() ||
    resolveMediaField(locale, "location", mediaTextSource(media)) ||
    (koUi ? "서울" : "Seoul");
  const marketing = marketingTypeLabel(media, locale);
  const typePart =
    marketing ||
    resolveMediaDisplayPill(
      media,
      pillLocale === "ko" ? "ko" : "en",
    ) ||
    (koUi ? "옥외광고" : "OOH");
  const suffix = koUi ? "옥외광고" : "OOH advertising";
  return `${name} — ${region} ${typePart} ${suffix}`.replace(/\s+/g, " ").trim();
}
